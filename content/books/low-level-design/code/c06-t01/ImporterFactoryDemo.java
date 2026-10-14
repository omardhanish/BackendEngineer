import java.util.List;
import java.util.Objects;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;

public class ImporterFactoryDemo {
    public static void main(String[] args) {
        System.out.println(new CsvImportJob().run("id,name\n1,Ada\n2,Linus"));
        System.out.println(new JsonImportJob().run("[{\"id\":1},{\"id\":2}]"));
        System.out.println(new XmlImportJob().run("<r id='1'/><r id='2'/>"));
        try { new CsvImportJob().run("   "); }
        catch (IllegalArgumentException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}

// Product: the one thing every parser must do.
interface RowParser { List<String> parse(String text); }

// Creator: owns the workflow and leaves one creation step open.
abstract class ImportJob {
    public final String run(String text) {
        Objects.requireNonNull(text, "text");
        if (text.isBlank()) throw new IllegalArgumentException("empty input");
        RowParser parser = createParser();          // the factory method
        List<String> rows = List.copyOf(parser.parse(text));
        return name() + ": " + rows.size() + " rows " + rows;
    }
    protected abstract RowParser createParser();
    protected abstract String name();
}
// Concrete creators: each one decides which product to build.
final class CsvImportJob extends ImportJob {
    @Override protected RowParser createParser() { return new CsvParser(); }
    @Override protected String name() { return "csv"; }
}
final class JsonImportJob extends ImportJob {
    @Override protected RowParser createParser() {
        return new RegexParser("\\{[^}]*\\}");
    }
    @Override protected String name() { return "json"; }
}
// Added later: no existing class was edited to support XML.
final class XmlImportJob extends ImportJob {
    @Override protected RowParser createParser() {
        return new RegexParser("<r[^>]*/>");
    }
    @Override protected String name() { return "xml"; }
}
// Concrete products: the objects the creators build.
final class CsvParser implements RowParser {
    @Override public List<String> parse(String text) {
        List<String> lines = List.of(text.split("\n"));
        return lines.subList(1, lines.size());      // drop the header
    }
}
final class RegexParser implements RowParser {
    private final Pattern row;
    RegexParser(String regex) { this.row = Pattern.compile(regex); }
    @Override public List<String> parse(String text) {
        return row.matcher(text).results().map(MatchResult::group).toList();
    }
}
