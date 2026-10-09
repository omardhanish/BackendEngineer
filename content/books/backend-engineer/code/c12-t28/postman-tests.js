// Request 1, in its Scripts > Post-response tab
pm.test('registers the user', () => {
  pm.response.to.have.status(201);
  const { success, data } = pm.response.json();
  pm.expect(success).to.eql(true);
  pm.expect(data.user.username).to.eql('ada');
  pm.expect(data.user).to.not.have.property('password');
});

// Request 2: the same body again
pm.test('rejects the repeat', () => {
  pm.response.to.have.status(409);
  pm.expect(pm.response.json().success).to.eql(false);
});
