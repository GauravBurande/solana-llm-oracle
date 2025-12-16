use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Part {
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Content {
    pub parts: Vec<Part>,
}

#[derive(Serialize)]
pub struct RequestBody {
    pub contents: Vec<Content>,
}
#[derive(Deserialize, Debug)]
pub struct Candidate {
    pub content: Content,
}

#[derive(Deserialize, Debug)]
pub struct ApiResponse {
    pub candidates: Vec<Candidate>,
}
