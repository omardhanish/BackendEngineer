public class RegionKitDemo {
    public static void main(String[] args) {
        checkout(new UkKit(), 100.0);
        checkout(new IndiaKit(), 100.0);
    }

    static void checkout(RegionKit kit, double net) {
        TaxRule tax = kit.taxRule();
        Receipt receipt = kit.receipt();
        System.out.println(receipt.format(net, tax.taxOn(net)));
    }
}

interface TaxRule { double taxOn(double net); }

interface Receipt { String format(double net, double tax); }

interface RegionKit {
    TaxRule taxRule();
    Receipt receipt();
}

class UkKit implements RegionKit {
    public TaxRule taxRule() { return net -> net * 0.20; }
    public Receipt receipt() {
        return (net, tax) -> "UK  net " + net + " + VAT " + tax;
    }
}

class IndiaKit implements RegionKit {
    public TaxRule taxRule() { return net -> net * 0.18; }
    public Receipt receipt() {
        return (net, tax) -> "IN  net " + net + " + GST " + tax;
    }
}
