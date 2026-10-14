import java.util.List;

public class Scope {
    public static void main(String[] args) {
        List<LimitRule> rules = List.of(
            new LimitRule(KeyType.API_KEY, 100, 60),
            new LimitRule(KeyType.USER_ID, 20, 1),
            new LimitRule(KeyType.IP_ADDRESS, 300, 60));
        for (LimitRule r : rules) {
            System.out.println(r.describe());
        }
        for (UseCase uc : UseCase.values()) {
            String tag = uc.inV1 ? "IN " : "OUT";
            System.out.println(tag + " " + uc.actor + ": " + uc.name());
        }
    }
}

enum KeyType { API_KEY, USER_ID, IP_ADDRESS }

record LimitRule(KeyType keyType, int limit, int windowSeconds) {
    LimitRule {
        if (limit <= 0 || windowSeconds <= 0) {
            throw new IllegalArgumentException("limit and window must be > 0");
        }
    }
    String describe() {
        return limit + " requests per " + windowSeconds + "s per " + keyType;
    }
}

enum UseCase {
    CHECK_REQUEST("Caller", true),
    REPORT_REMAINING_AND_RETRY_AFTER("Caller", true),
    CONFIGURE_RULE_PER_KEY_TYPE("Operator", true),
    REFILL_OR_ROLL_WINDOW("Clock", true),
    SHARE_LIMIT_ACROSS_INSTANCES("Operator", false),
    MONTHLY_BILLING_QUOTA("Operator", false),
    BLOCK_NETWORK_FLOODS("Network", false);

    final String actor;
    final boolean inV1;
    UseCase(String actor, boolean inV1) {
        this.actor = actor;
        this.inV1 = inV1;
    }
}
