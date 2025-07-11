export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
}

export enum PlanType {
  INDIVIDUAL = 'INDIVIDUAL',
  FAMILY = 'FAMILY',
  GROUP = 'GROUP',
  MEDICARE = 'MEDICARE',
}

export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
}

export enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  PENDING_INFO = 'PENDING_INFO',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum SupportChannel {
  EMAIL = 'EMAIL',
  CHAT = 'CHAT',
  PHONE = 'PHONE',
  PORTAL = 'PORTAL',
}

export enum EntityType {
  CLAIM = 'CLAIM',
  POLICY = 'POLICY',
  TICKET = 'TICKET',
} 