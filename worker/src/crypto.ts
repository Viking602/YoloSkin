const encoder = new TextEncoder()
const PASSWORD_ITERATIONS = 210_000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  return base64ToBytes(normalized + "=".repeat((4 - normalized.length % 4) % 4))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const data = typeof value === "string" ? encoder.encode(value) : value
  const digest = await crypto.subtle.digest("SHA-256", data)
  return bytesToHex(new Uint8Array(digest))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"])
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    material,
    256,
  )
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(derived))}`
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, expectedText] = encoded.split("$")
  const iterations = Number(iterationsText)
  if (algorithm !== "pbkdf2_sha256" || !Number.isSafeInteger(iterations) || !saltText || !expectedText) return false
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"])
  const actual = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(saltText), iterations },
    material,
    256,
  )
  const expected = base64ToBytes(expectedText)
  return expected.byteLength === actual.byteLength && crypto.subtle.timingSafeEqual(actual, expected.buffer)
}

export async function signHmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return bytesToBase64(new Uint8Array(signature)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export async function verifyHmac(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await signHmac(payload, secret)
  const [actualHash, expectedHash] = await Promise.all([sha256(signature), sha256(expected)])
  return crypto.subtle.timingSafeEqual(encoder.encode(actualHash), encoder.encode(expectedHash))
}

async function importEncryptionKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(secret))
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, [usage])
}

export async function encryptSecret(value: string, secret: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const key = await importEncryptionKey(secret, "encrypt")
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value))
  return { ciphertext: bytesToBase64Url(new Uint8Array(encrypted)), iv: bytesToBase64Url(iv) }
}

export async function decryptSecret(ciphertext: string, iv: string, secret: string): Promise<string> {
  const key = await importEncryptionKey(secret, "decrypt")
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(iv) },
    key,
    base64UrlToBytes(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}
