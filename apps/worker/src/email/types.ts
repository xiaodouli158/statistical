export type EmailProcessingMessage = {
  inboundEmailId: string;
};

export type InboundEmailProcessingStatus = "pending" | "processed" | "failed";
