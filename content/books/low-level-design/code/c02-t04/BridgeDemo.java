import java.util.List;

public class BridgeDemo {
    public static void main(String[] args) {
        List<Channel> channels = List.of(new EmailChannel(), new SmsChannel());
        for (Channel channel : channels) {
            new Notice(channel).send("disk 80% full");
            new Urgent(channel).send("disk 99% full");
        }
    }
}

interface Channel {
    void deliver(String text);
}

class EmailChannel implements Channel {
    public void deliver(String text) { System.out.println("email: " + text); }
}

class SmsChannel implements Channel {
    public void deliver(String text) { System.out.println("sms:   " + text); }
}

abstract class Alert {
    protected final Channel channel;

    Alert(Channel channel) { this.channel = channel; }

    abstract void send(String message);
}

class Notice extends Alert {
    Notice(Channel channel) { super(channel); }
    void send(String m) { channel.deliver("[info] " + m); }
}

class Urgent extends Alert {
    Urgent(Channel channel) { super(channel); }
    void send(String m) {
        channel.deliver("[URGENT] " + m.toUpperCase() + ", reply ACK");
    }
}
