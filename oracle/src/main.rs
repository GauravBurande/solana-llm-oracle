use log::Level;
use reqwest::Client;
use std::{env, vec};
use tokio::sync::mpsc;

use crate::types::{ApiResponse, Content, Part, RequestBody};

mod types;

const MAX_TX_RETRY_ATTEMPTS: u8 = 5;
const MAX_API_RETRY_ATTEMPTS: u8 = 3;

#[tokio::main]
async fn main() {
    simple_logger::init_with_level(Level::Info).unwrap();
    // let client = Client::new();
    // let (api_key, rpc_url, websocket_url) = load_config()

    // let text = "give me a u8 number and NOTHING ELSE!!";
    // llm_inference(client, api_key.as_str(), text).await;
    let (tx, mut rx) = mpsc::channel(10);

    tokio::spawn(async move {
        tx.send("hello").await.unwrap();
    });

    while let Some(msg) = rx.recv().await {
        println!("Got: {}", msg);
    }
}

async fn llm_inference(client: Client, api_key: &str, text: &str) {
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
            let api_res: ApiResponse = res.json().await.unwrap();
            log::info!("ai res: {}", api_res.candidates[0].content.parts[0].text)
        }

        Err(_) => log::error!("Failed to get ai response!"),
    }
}

async fn run_oracle() {}

async fn load_config() -> (String, String, String) {
    let api_key = env::var("GOOGLE_AI_API_KEY").expect("Invalid API Key!");
    let rpc_url = env::var("RPC_URL").unwrap_or("http://localhost:8899".to_string());
    let websocket_url = env::var("WEBSOCKET_URL").unwrap_or("ws://localhost:8900".to_string());

    (api_key, rpc_url, websocket_url)
}
