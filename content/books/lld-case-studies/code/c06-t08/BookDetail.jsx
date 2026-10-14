// React component: renders state and dispatches; the reducer owns rules.
export function BookDetail({ book, state, dispatch, api }) {
  async function borrow() {
    if (state.step !== 'IDLE') return;        // in flight: ignore
    const key = state.key ?? crypto.randomUUID();  // reuse on retry
    dispatch({ type: 'BORROW_CLICKED', key });
    let res;
    try { res = await api.borrow(book.isbn, key); }
    catch { return dispatch({ type: 'NETWORK_ERROR' }); }
    if (res.body?.error === 'NO_COPY_AVAILABLE')
      return dispatch({ type: 'NO_COPY' });
    if (!res.ok) return dispatch({ type: 'FAILED', error: res.body?.error });
    dispatch({ type: 'BORROW_OK', ...res.body });
  }
  if (!book) return <Spinner label="Loading book" />;
  const busy = state.step === 'BORROWING' || state.step === 'RESERVING';
  return (
    <section>
      <h2>{book.title}</h2>
      <p>{book.author} · {book.freeCopies} of {book.totalCopies} free</p>
      {state.message && <p role="status">{state.message}</p>}
      {state.mode === 'BORROW'
        ? <button disabled={busy || state.step !== 'IDLE'}
            onClick={borrow}>Borrow</button>
        : <ReserveButton disabled={busy || state.step === 'RESERVED'}
            isbn={book.isbn} dispatch={dispatch} api={api} />}
    </section>
  );
}
