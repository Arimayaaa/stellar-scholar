#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn records_and_reads_donations() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let donor = Address::generate(&env);
    let destination = Address::generate(&env);

    let contract_id = env.register(StellarScholarContract, ());
    let client = StellarScholarContractClient::new(&env, &contract_id);

    env.mock_all_auths();
    client.init(&admin);

    let donation_id = client.record_donation(
        &donor,
        &destination,
        &1_500_000i128,
        &String::from_str(&env, "Kitap destegi"),
    );

    assert_eq!(donation_id, 1);

    let donation = client.get_donation(&donation_id);
    assert_eq!(donation.id, 1);
    assert_eq!(donation.amount_stroops, 1_500_000i128);

    let summary = client.get_summary();
    assert_eq!(summary, (1u32, 1_500_000i128));

    let recent = client.list_recent(&5);
    assert_eq!(recent.len(), 1);
}
