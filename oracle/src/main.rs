use log::Level;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::{env, vec};

#[derive(Serialize, Deserialize)]
struct Part {
    text: String,
}

#[derive(Serialize, Deserialize)]
struct Content {
    parts: Vec<Part>,
}

#[derive(Serialize)]
struct RequestBody {
    contents: Vec<Content>,
}
#[derive(Deserialize)]
struct Candidate {
    content: Content,
}

#[derive(Deserialize)]
struct ApiResponse {
    candidates: Vec<Candidate>,
}

#[tokio::main]
async fn main() {
    simple_logger::init_with_level(Level::Info).unwrap();
    let client = Client::new();
    let api_key = env::var("GOOGLE_AI_API_KEY").expect("Invalid API Key!");

    let text = "give me a u8 number and NOTHING ELSE!!";
    llm_inference(client, api_key.as_str(), text).await;
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
