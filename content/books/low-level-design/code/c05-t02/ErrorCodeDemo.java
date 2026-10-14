import java.io.IOException;
import java.util.List;
import java.util.Objects;

public class ErrorCodeDemo {
    public static void main(String[] args) {
        BankGateway bank = cents -> {
            if (cents == 777) throw new IOException("bank timeout");
        };
        PaymentService payments = new PaymentService(bank, 50_000);
        for (int cents : List.of(500, 90_000, 777)) {
            System.out.println(cents + " -> " + respond(payments, cents));
        }
    }

    // The boundary maps codes, never message text, to a response.
    static String respond(PaymentService payments, int cents) {
        try {
            payments.charge(cents);
            return "200 OK";
        } catch (PaymentException e) {
            String cause = e.getCause() == null
                ? "" : " cause=" + e.getCause().getMessage();
            int status = switch (e.code()) {
                case CARD_DECLINED -> 402;
                case GATEWAY_DOWN -> 503;
            };
            return status + " " + e.code() + cause;
        }
    }
}

enum ErrorCode { CARD_DECLINED, GATEWAY_DOWN }

// One unchecked base type; the code, not the message, is the contract.
abstract class PaymentException extends RuntimeException {
    private final ErrorCode code;
    PaymentException(ErrorCode code, String message, Throwable cause) {
        super(message, cause);
        this.code = Objects.requireNonNull(code, "code");
    }
    ErrorCode code() { return code; }
}

final class CardDeclinedException extends PaymentException {
    CardDeclinedException(int limit) {
        super(ErrorCode.CARD_DECLINED, "over limit " + limit, null);
    }
}

final class GatewayDownException extends PaymentException {
    GatewayDownException(IOException cause) {
        super(ErrorCode.GATEWAY_DOWN, "bank unreachable", cause);
    }
}

interface BankGateway { void send(int cents) throws IOException; }

record PaymentService(BankGateway bank, int limitCents) {
    PaymentService { Objects.requireNonNull(bank, "bank"); }

    void charge(int cents) {
        if (cents > limitCents) throw new CardDeclinedException(limitCents);
        try {
            bank.send(cents);
        } catch (IOException e) {
            throw new GatewayDownException(e); // wrap, keep the cause
        }
    }
}
