-- Spotriq v0.31.0 — paid commercial rails reconciliation.
-- Adds queryable settlement references while preserving the full evidence payload.

alter table commercial_payment_evidence add column if not exists settlement_tx_hash text;
alter table commercial_payment_evidence add column if not exists settlement_block_number text;
create index if not exists commercial_payment_settlement_tx_idx
  on commercial_payment_evidence(rail, settlement_tx_hash)
  where settlement_tx_hash is not null;
create index if not exists idx_operator_service_declarations_service_updated
  on operator_service_declarations(service_id, updated_at desc);
alter table commercial_payment_evidence add column if not exists settlement_log_index integer;
create unique index if not exists commercial_payment_settlement_log_unique_idx
  on commercial_payment_evidence(settlement_tx_hash, settlement_log_index)
  where settlement_tx_hash is not null and settlement_log_index is not null;
