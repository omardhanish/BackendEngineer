public class WalletDemo {
    public static void main(String[] args) {
        Wallet wallet = new Wallet(5000);
        wallet.pay(2040);
        System.out.println("balance " + wallet.balance());
        try {
            wallet.pay(9000);
        } catch (IllegalStateException e) {
            System.out.println("refused: " + e.getMessage());
        }
        System.out.println("balance " + wallet.balance());
    }
}

class Wallet {
    private long balance;               // hidden: no setter, no public field

    Wallet(long opening) {
        if (opening < 0) {
            throw new IllegalArgumentException("negative opening");
        }
        this.balance = opening;
    }

    long balance() {
        return balance;
    }

    void pay(long amount) {             // the only way to change balance
        if (amount <= 0) {
            throw new IllegalArgumentException("bad amount " + amount);
        }
        if (amount > balance) {
            throw new IllegalStateException("cannot pay " + amount);
        }
        balance -= amount;
    }
}
