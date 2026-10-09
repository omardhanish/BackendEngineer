// Scripts > Post-response tab of the "Create book" request
pm.test("status is 201", () => {
  pm.response.to.have.status(201);
});

const book = pm.response.json();
pm.test("the title is stored", () => {
  pm.expect(book.title).to.eql("Hyperion");
});

// Later requests use {{book_id}} in their URL.
pm.collectionVariables.set("book_id", book.id);
