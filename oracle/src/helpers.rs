pub fn sanitize_ai_text(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_ascii() && !c.is_control())
        .collect()
}

pub fn truncate_to_bytes(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }

    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }

    s[..end].to_string()
}

pub fn compute_max_ai_string_bytes(total_accounts: usize) -> usize {
    const TX_LIMIT: usize = 1232;
    const FIXED_OVERHEAD: usize = 65; // header + blockhash + compute ix

    let used = FIXED_OVERHEAD + 32 * total_accounts;

    // subtract discriminator + borsh string len
    TX_LIMIT.saturating_sub(used).saturating_sub(12).min(800) // hard clamp for safety
}
