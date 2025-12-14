use anchor_lang::{AccountDeserialize, AnchorSerialize, Discriminator};
use log::Level;
use reqwest::Client;
use solana_account_decoder::UiAccountEncoding;
use solana_client::{
    pubsub_client::PubsubClient,
    rpc_client::RpcClient,
    rpc_config::{RpcAccountInfoConfig, RpcProgramAccountsConfig},
    rpc_filter::{Memcmp, RpcFilterType},
};
use solana_sdk::{
    commitment_config::CommitmentConfig,
    compute_budget::ComputeBudgetInstruction,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Keypair,
    signer::Signer,
    transaction::Transaction,
};
use std::{env, error::Error, str::FromStr, vec};
use tokio::sync::mpsc;
use tokio_stream::{StreamExt, wrappers::ReceiverStream};

use crate::types::{ApiResponse, Content, Part, RequestBody};

mod types;

const MAX_TX_RETRY_ATTEMPTS: u8 = 3;
const MAX_API_RETRY_ATTEMPTS: u8 = 2;

#[tokio::main]
async fn main() {
    simple_logger::init_with_level(Level::Info).unwrap();
    let (api_key, rpc_url, websocket_url, payer, config_pda, program_id) = load_config();

    log::info!(" Oracle identity: {:?}", payer.pubkey());
    log::info!(" RPC: {:?}", rpc_url.as_str());
    log::info!(" WS: {:?}", websocket_url.as_str());
    loop {
        if let Err(e) = run_oracle(
            rpc_url.as_str(),
            websocket_url.as_str(),
            api_key.as_str(),
            &payer,
            &config_pda,
            &program_id,
        )
        .await
        {
            log::error!("Error running oracle {:?}, Restarting....", e);
        }
    }
}

async fn run_oracle(
    rpc_url: &str,
    websocket_url: &str,
    api_key: &str,
    payer: &Keypair,
    config_pda: &Pubkey,
    program_id: &Pubkey,
) -> Result<(), Box<dyn Error>> {
    let client: Client = Client::new();

    let rpc_client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::processed());

    let (tx, rx) = mpsc::channel(100);
    let mut stream = ReceiverStream::new(rx);

    let rpc_config = RpcAccountInfoConfig {
        commitment: Some(CommitmentConfig::processed()),
        encoding: Some(UiAccountEncoding::Base64),
        ..Default::default()
    };

    let filters = vec![RpcFilterType::Memcmp(Memcmp::new(
        0,
        solana_client::rpc_filter::MemcmpEncodedBytes::Bytes(
            solana_llm_oracle::Inference::DISCRIMINATOR.to_vec(),
        ),
    ))];

    let program_config = RpcProgramAccountsConfig {
        account_config: rpc_config,
        filters: Some(filters),
        ..Default::default()
    };

    let subscription =
        PubsubClient::program_subscribe(websocket_url, program_id, Some(program_config))?;

    tokio::spawn(async move {
        for update in subscription.1 {
            if tx.send(update).await.is_err() {
                log::error!("Receiver dropped");
                break;
            }
        }
    });

    while let Some(update) = stream.next().await {
        if let Ok(inference_pubkey) = Pubkey::from_str(&update.value.pubkey) {
            if let Some(data) = update.value.account.data.decode() {
                process_inference(
                    &payer,
                    &config_pda,
                    &client,
                    api_key,
                    &rpc_client,
                    &inference_pubkey,
                    data,
                    program_id,
                )
                .await?;
                log::info!("inference pda: {:?}", inference_pubkey);
            }
        }
    }

    Ok(())
}

async fn process_inference(
    payer: &Keypair,
    config_pda: &Pubkey,
    client: &Client,
    api_key: &str,
    rpc_client: &RpcClient,
    inference_pubkey: &Pubkey,
    data: Vec<u8>,
    program_id: &Pubkey,
) -> Result<(), Box<dyn Error>> {
    if let Ok(inference) =
        solana_llm_oracle::Inference::try_deserialize_unchecked(&mut data.as_slice())
    {
        if inference.is_processed == true {
            return Ok(());
        }

        log::info!("Processing inference: {:?}", inference_pubkey);

        if let Ok(chat_context_data) = rpc_client.get_account(&inference.chat_context) {
            if let Ok(chat_context) = solana_llm_oracle::ChatContext::try_deserialize_unchecked(
                &mut chat_context_data.data.as_slice(),
            ) {
                log::info!("processing inference data: {:?}", inference);
                let prompt = format!("{}, {}", chat_context.text, inference.text);

                let mut ai_response = String::new();
                let mut api_attempt = 0;

                while api_attempt < MAX_API_RETRY_ATTEMPTS {
                    match llm_inference(client, &api_key, prompt.as_str()).await {
                        Ok(response) => {
                            ai_response = response;
                            break;
                        }
                        Err(e) => {
                            api_attempt += 1;
                            log::error!(
                                "Ai inference Failed(attempt {}/{}): {:?}",
                                api_attempt,
                                MAX_API_RETRY_ATTEMPTS,
                                e
                            );

                            if api_attempt >= MAX_API_RETRY_ATTEMPTS {
                                return Err(e);
                            }
                        }
                    }
                }

                let response_data = [
                    solana_llm_oracle::instruction::CallbackFromLlm::DISCRIMINATOR.to_vec(),
                    ai_response.try_to_vec()?,
                ]
                .concat();

                let mut callback_instruction = Instruction {
                    program_id: *program_id,
                    accounts: vec![
                        AccountMeta::new(payer.pubkey(), true),
                        AccountMeta::new_readonly(*config_pda, false),
                        AccountMeta::new(*inference_pubkey, false),
                        AccountMeta::new_readonly(inference.callback_program_id, false),
                    ],
                    data: response_data,
                };

                let remaining_accounts: Vec<AccountMeta> = inference
                    .callback_account_metas
                    .iter()
                    .map(|meta| AccountMeta {
                        pubkey: meta.pubkey,
                        is_signer: false,
                        is_writable: meta.is_writable,
                    })
                    .collect();

                callback_instruction.accounts.extend(remaining_accounts);

                let mut attempts = 0;
                while attempts < MAX_TX_RETRY_ATTEMPTS {
                    if let Ok(recent_blockhash) = rpc_client
                        .get_latest_blockhash_with_commitment(CommitmentConfig::processed())
                    {
                        let compute_budget_instruction =
                            ComputeBudgetInstruction::set_compute_unit_limit(300_000);
                        let priority_fee_instruction =
                            ComputeBudgetInstruction::set_compute_unit_price(200_000);

                        let transaction = Transaction::new_signed_with_payer(
                            &[
                                compute_budget_instruction,
                                priority_fee_instruction,
                                callback_instruction.clone(),
                            ],
                            Some(&payer.pubkey()),
                            &[payer],
                            recent_blockhash.0,
                        );

                        match rpc_client.send_and_confirm_transaction(&transaction) {
                            Ok(signature) => {
                                log::info!("Txn Signature: {}\n", signature);
                                break;
                            }
                            Err(e) => {
                                attempts += 1;
                                log::error!(
                                    "Failed to send txn(attempt {}/{}): {:?}",
                                    attempts,
                                    MAX_TX_RETRY_ATTEMPTS,
                                    e
                                );
                                if attempts >= MAX_TX_RETRY_ATTEMPTS {
                                    return Err(Box::new(e));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

async fn llm_inference(
    client: &Client,
    api_key: &str,
    text: &str,
) -> Result<String, Box<dyn Error>> {
    let request_body = RequestBody {
        contents: vec![Content {
            parts: vec![Part {
                text: text.to_string(),
            }],
        }],
    };

    let url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", api_key)
        .json(&request_body)
        .send()
        .await;

    match response {
        Ok(res) => {
            let api_res: ApiResponse = res.json().await?;
            let text = api_res.candidates[0].content.parts[0].text.clone();
            log::info!("ai res: {}", text);
            Ok(text)
        }
        Err(e) => {
            log::error!("Failed to get ai response: {}", e);
            Err(Box::new(e))
        }
    }
}

fn load_config() -> (String, String, String, Keypair, Pubkey, Pubkey) {
    let secret_key = env::var("ORACLE_PRIVATE_KEY").expect("missing private key");
    let api_key = env::var("GOOGLE_AI_API_KEY").expect("Invalid API Key!");
    let rpc_url = env::var("RPC_URL").unwrap_or("http://localhost:8899".to_string());
    let websocket_url = env::var("WEBSOCKET_URL").unwrap_or("ws://localhost:8900".to_string());
    let payer = Keypair::from_base58_string(&secret_key);
    let program_id = solana_llm_oracle::ID;
    let config_pda = Pubkey::find_program_address(&[b"config"], &program_id).0;
    (
        api_key,
        rpc_url,
        websocket_url,
        payer,
        config_pda,
        program_id,
    )
}
