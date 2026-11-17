/// Little World Explorer Passport (Sui testnet, hackathon build).
/// A player-owned passport object holding in-game city stamps.
/// Stamps record in-game exploration only; they do NOT verify real-world travel or location.
/// Non-financial collectible: no transfer market, no token, no value promise.
module little_world::passport {
    use std::string::String;
    use sui::event;

    /// City id is already stamped on this passport.
    const EAlreadyStamped: u64 = 0;
    /// City id outside the supported 26-city world.
    const EUnknownCity: u64 = 1;

    /// Maximum supported city id (25 world cities + Kerala home = ids 0..=25).
    const MAX_CITY_ID: u64 = 25;

    public struct Passport has key, store {
        id: UID,
        /// In-game display name chosen by the player. Not a verified identity.
        player_name: String,
        /// City ids stamped so far. Duplicates are rejected.
        stamps: vector<u64>,
    }

    public struct PassportCreated has copy, drop {
        passport: address,
    }

    public struct StampAdded has copy, drop {
        passport: address,
        city_id: u64,
        total: u64,
    }

    /// Create a new passport owned by the transaction sender.
    public fun create_passport(player_name: String, ctx: &mut TxContext) {
        let p = Passport {
            id: object::new(ctx),
            player_name,
            stamps: vector[],
        };
        event::emit(PassportCreated { passport: object::uid_to_address(&p.id) });
        transfer::transfer(p, ctx.sender());
    }

    /// Add a city stamp. Aborts if the city is already stamped (replay protection)
    /// or the id is outside the known world.
    public fun add_stamp(p: &mut Passport, city_id: u64) {
        assert!(city_id <= MAX_CITY_ID, EUnknownCity);
        assert!(!p.stamps.contains(&city_id), EAlreadyStamped);
        p.stamps.push_back(city_id);
        event::emit(StampAdded {
            passport: object::uid_to_address(&p.id),
            city_id,
            total: p.stamps.length(),
        });
    }

    public fun stamp_count(p: &Passport): u64 { p.stamps.length() }
    public fun has_stamp(p: &Passport, city_id: u64): bool { p.stamps.contains(&city_id) }
    public fun player_name(p: &Passport): String { p.player_name }

    #[test_only]
    public fun new_for_testing(player_name: String, ctx: &mut TxContext): Passport {
        Passport { id: object::new(ctx), player_name, stamps: vector[] }
    }
}
