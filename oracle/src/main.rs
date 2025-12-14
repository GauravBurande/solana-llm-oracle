use anchor_lang::{AccountDeserialize, Discriminator};
use log::Level;
use reqwest::Client;
use solana_client::{
    pubsub_client::PubsubClient,
    rpc_client::RpcClient,
    rpc_config::{
        CommitmentConfig, RpcAccountInfoConfig, RpcProgramAccountsConfig, UiAccountEncoding,
    },
    rpc_filter::{Memcmp, RpcFilterType},
};
use solana_sdk::{pubkey::Pubkey, signature::Keypair, signer::Signer};
use std::{env, error::Error, str::FromStr, vec};
use tokio::sync::mpsc;
use tokio_stream::{StreamExt, wrappers::ReceiverStream};

use crate::types::{ApiResponse, Content, Part, RequestBody};

mod types;

const MAX_TX_RETRY_ATTEMPTS: u8 = 5;
const MAX_API_RETRY_ATTEMPTS: u8 = 3;

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
                log::info!("inference pda: {:?}", inference_pubkey);
                if let Ok(inference) =
                    solana_llm_oracle::Inference::try_deserialize_unchecked(&mut data.as_slice())
                {
                    log::info!("Inference Account data: {:?}", inference);
                }
            }
        }
    }

    Ok(())
}

async fn llm_inference(
    client: Client,
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
    let program_id = Pubkey::new_from_array(solana_llm_oracle::ID.to_bytes());
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
