import { deliverPasswordResetEmail } from "./services/email"
import type { PasswordResetQueueMessage } from "./types"

function isPasswordResetMessage(value: unknown): value is PasswordResetQueueMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Partial<PasswordResetQueueMessage>
  return message.type === "password_reset" && Number.isSafeInteger(message.uid) && typeof message.deliveryId === "string"
}

export async function handlePasswordResetQueue(
  batch: MessageBatch<PasswordResetQueueMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  for (const message of batch.messages) {
    if (!isPasswordResetMessage(message.body)) {
      console.error(JSON.stringify({ message: "discarding invalid password reset queue message", messageId: message.id }))
      message.ack()
      continue
    }
    try {
      await deliverPasswordResetEmail(env, message.body)
      message.ack()
    } catch (error) {
      console.error(JSON.stringify({
        message: "password reset email delivery failed",
        messageId: message.id,
        deliveryId: message.body.deliveryId,
        attempts: message.attempts,
        error: error instanceof Error ? error.message : String(error),
      }))
      message.retry({ delaySeconds: Math.min(300, 15 * 2 ** Math.max(0, message.attempts - 1)) })
    }
  }
}
