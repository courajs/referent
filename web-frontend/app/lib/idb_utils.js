export function promisifyReq(req) {
  return new Promise(function(resolve, reject) {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function promisifyTx(tx) {
  return new Promise(function(resolve, reject) {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = reject;
  });
}
