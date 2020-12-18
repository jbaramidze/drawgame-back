export function getAuthHeader() {
    const hash = sessionStorage.getItem("hash");
    return hash ? {headers: {authorization: `Bearer ${hash}`}} : {};
}
