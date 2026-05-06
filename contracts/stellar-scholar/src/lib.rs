#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec,
};

const TOTAL_COUNT: Symbol = symbol_short!("TOTAL");
const TOTAL_AMOUNT: Symbol = symbol_short!("AMOUNT");
const ADMIN: Symbol = symbol_short!("ADMIN");
const LAST_ID: Symbol = symbol_short!("LAST_ID");

#[derive(Clone)]
#[contracttype]
pub struct DonationRecord {
    pub id: u32,
    pub donor: Address,
    pub destination: Address,
    pub amount_stroops: i128,
    pub memo: String,
    pub timestamp: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Donation(u32),
}

#[contract]
pub struct StellarScholarContract;

#[contractimpl]
impl StellarScholarContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }

        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&TOTAL_COUNT, &0u32);
        env.storage().instance().set(&TOTAL_AMOUNT, &0i128);
        env.storage().instance().set(&LAST_ID, &0u32);
        env.storage().instance().extend_ttl(17280, 17280 * 30);
    }

    pub fn record_donation(
        env: Env,
        donor: Address,
        destination: Address,
        amount_stroops: i128,
        memo: String,
    ) -> u32 {
        let admin = get_admin(&env);
        admin.require_auth();

        if amount_stroops <= 0 {
            panic!("amount must be positive");
        }

        let memo_len = memo.len();
        if memo_len > 120 {
            panic!("memo too long");
        }

        let next_id: u32 = env.storage().instance().get(&LAST_ID).unwrap_or(0) + 1;
        let current_total_count: u32 = env.storage().instance().get(&TOTAL_COUNT).unwrap_or(0);
        let current_total_amount: i128 =
            env.storage().instance().get(&TOTAL_AMOUNT).unwrap_or(0);

        let record = DonationRecord {
            id: next_id,
            donor,
            destination,
            amount_stroops,
            memo,
            timestamp: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Donation(next_id), &record);

        env.storage().instance().set(&LAST_ID, &next_id);
        env.storage()
            .instance()
            .set(&TOTAL_COUNT, &(current_total_count + 1));
        env.storage()
            .instance()
            .set(&TOTAL_AMOUNT, &(current_total_amount + amount_stroops));
        env.storage().instance().extend_ttl(17280, 17280 * 30);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Donation(next_id), 17280, 17280 * 30);

        next_id
    }

    pub fn get_donation(env: Env, donation_id: u32) -> DonationRecord {
        env.storage()
            .persistent()
            .get(&DataKey::Donation(donation_id))
            .unwrap()
    }

    pub fn get_summary(env: Env) -> (u32, i128) {
        let total_count: u32 = env.storage().instance().get(&TOTAL_COUNT).unwrap_or(0);
        let total_amount: i128 = env.storage().instance().get(&TOTAL_AMOUNT).unwrap_or(0);
        (total_count, total_amount)
    }

    pub fn list_recent(env: Env, limit: u32) -> Vec<DonationRecord> {
        let last_id: u32 = env.storage().instance().get(&LAST_ID).unwrap_or(0);
        let max_items = if limit == 0 {
            5
        } else if limit > 10 {
            10
        } else {
            limit
        };

        let mut records = Vec::new(&env);
        let mut cursor = last_id;
        let mut loaded = 0u32;

        while cursor > 0 && loaded < max_items {
            if let Some(record) = env
                .storage()
                .persistent()
                .get::<DataKey, DonationRecord>(&DataKey::Donation(cursor))
            {
                records.push_back(record);
                loaded += 1;
            }
            cursor -= 1;
        }

        records
    }
}

fn get_admin(env: &Env) -> Address {
    env.storage().instance().get(&ADMIN).unwrap()
}

mod test;
