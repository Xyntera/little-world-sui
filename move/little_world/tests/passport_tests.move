#[test_only]
module little_world::passport_tests {
    use little_world::passport::{Self, Passport};
    use std::string;
    use sui::test_scenario as ts;

    #[test]
    fun create_and_stamp() {
        let mut sc = ts::begin(@0xA);
        {
            let ctx = ts::ctx(&mut sc);
            let mut p = passport::new_for_testing(string::utf8(b"Explorer"), ctx);
            passport::add_stamp(&mut p, 0);
            passport::add_stamp(&mut p, 25);
            assert!(passport::stamp_count(&p) == 2, 0);
            assert!(passport::has_stamp(&p, 0), 1);
            assert!(!passport::has_stamp(&p, 3), 2);
            transfer::public_transfer(p, @0xA);
        };
        ts::end(sc);
    }

    #[test]
    #[expected_failure(abort_code = passport::EAlreadyStamped)]
    fun duplicate_stamp_rejected() {
        let mut sc = ts::begin(@0xA);
        {
            let ctx = ts::ctx(&mut sc);
            let mut p = passport::new_for_testing(string::utf8(b"Explorer"), ctx);
            passport::add_stamp(&mut p, 7);
            passport::add_stamp(&mut p, 7);
            transfer::public_transfer(p, @0xA);
        };
        ts::end(sc);
    }

    #[test]
    #[expected_failure(abort_code = passport::EUnknownCity)]
    fun unknown_city_rejected() {
        let mut sc = ts::begin(@0xA);
        {
            let ctx = ts::ctx(&mut sc);
            let mut p = passport::new_for_testing(string::utf8(b"Explorer"), ctx);
            passport::add_stamp(&mut p, 26);
            transfer::public_transfer(p, @0xA);
        };
        ts::end(sc);
    }
}
