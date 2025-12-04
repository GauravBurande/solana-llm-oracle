use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Part {
    pub text: String,
}

#[derive(Serialize, Deserialize)]
pub struct Content {
    pub parts: Vec<Part>,
}

#[derive(Serialize)]
pub struct RequestBody {
    pub contents: Vec<Content>,
}
#[derive(Deserialize)]
pub struct Candidate {
    pub content: Content,
}

#[derive(Deserialize)]
pub struct ApiResponse {
    pub candidates: Vec<Candidate>,
}
