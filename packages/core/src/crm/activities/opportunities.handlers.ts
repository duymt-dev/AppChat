// Facade (TIP-026c): handler cơ hội 026b dời sang crm/opportunities/* (pipeline 7 giai đoạn, xác suất cố định) — giữ đường import cũ.
export { OpportunityArchiveHandler as ContactOpportunityArchiveHandler, OpportunityCreateHandler as ContactOpportunityCreateHandler, OpportunityUpdateHandler as ContactOpportunityUpdateHandler } from '../opportunities/write.handlers';
