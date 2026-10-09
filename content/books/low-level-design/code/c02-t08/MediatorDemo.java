public class MediatorDemo {
    public static void main(String[] args) {
        SignupDialog dialog = new SignupDialog();
        dialog.email.type("ada@example.com");
        dialog.terms.tick(true);
        dialog.email.type("ada");
    }
}

interface DialogMediator {
    void changed(String widget);
}

class EmailField {
    private final DialogMediator mediator;
    private String value = "";
    EmailField(DialogMediator mediator) { this.mediator = mediator; }
    void type(String text) { value = text; mediator.changed("email"); }
    boolean valid() { return value.contains("@"); }
}

class TermsBox {
    private final DialogMediator mediator;
    private boolean ticked;
    TermsBox(DialogMediator mediator) { this.mediator = mediator; }
    void tick(boolean on) { ticked = on; mediator.changed("terms"); }
    boolean isTicked() { return ticked; }
}

class SubmitButton {
    void setEnabled(boolean on) {
        System.out.println("  submit " + (on ? "enabled" : "disabled"));
    }
}

class SignupDialog implements DialogMediator {
    final EmailField email = new EmailField(this);
    final TermsBox terms = new TermsBox(this);
    private final SubmitButton submit = new SubmitButton();

    public void changed(String widget) {
        System.out.println(widget + " changed");
        submit.setEnabled(email.valid() && terms.isTicked());
    }
}
