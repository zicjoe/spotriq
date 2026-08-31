import type {
  ActivateCommercialHireRequest,
  ApiEnvelope,
  BuyerCommercialStateResponse,
  CommercialHireResponse,
  CommercialPaymentResponse,
  CommercialQuoteResponse,
  CreateCommercialHireRequest,
  CreateCommercialQuoteRequest,
  MarketplaceActivationResponse,
  MarketplaceOffersResponse,
  ReconcileCommercialPaymentRequest,
} from "@spotriq/api-contracts";
import type {
  BuyerCommercialState,
  CommercialHire,
  CommercialPaymentEvidence,
  CommercialQuote,
  MarketplaceActivation,
  ServiceOffer,
} from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface CommercialRepository {
  listOffers(serviceId: string): Promise<ServiceOffer[]>;
  createQuote(input: CreateCommercialQuoteRequest): Promise<CommercialQuote>;
  getQuote(quoteId: string): Promise<CommercialQuote>;
  createHire(input: CreateCommercialHireRequest): Promise<CommercialHire>;
  getHire(hireId: string): Promise<CommercialHire>;
  getPayment(hireId: string): Promise<CommercialPaymentEvidence>;
  reconcilePayment(hireId: string, input: ReconcileCommercialPaymentRequest): Promise<CommercialPaymentEvidence>;
  activate(hireId: string, input: ActivateCommercialHireRequest): Promise<MarketplaceActivation>;
  getActivation(activationId: string): Promise<MarketplaceActivation>;
  getBuyerState(address: string): Promise<BuyerCommercialState>;
}

export class ApiCommercialRepository implements CommercialRepository {
  async listOffers(serviceId: string) {
    return unwrap(await apiRequest<ApiEnvelope<MarketplaceOffersResponse>>(`/v1/services/${encodeURIComponent(serviceId)}/offers`)).offers;
  }

  async createQuote(input: CreateCommercialQuoteRequest) {
    return unwrap(await apiRequest<ApiEnvelope<CommercialQuoteResponse>>("/v1/quotes", {
      method: "POST",
      body: JSON.stringify(input),
    })).quote;
  }

  async getQuote(quoteId: string) {
    return unwrap(await apiRequest<ApiEnvelope<CommercialQuoteResponse>>(`/v1/quotes/${encodeURIComponent(quoteId)}`)).quote;
  }

  async createHire(input: CreateCommercialHireRequest) {
    return unwrap(await apiRequest<ApiEnvelope<CommercialHireResponse>>("/v1/hires", {
      method: "POST",
      body: JSON.stringify(input),
    })).hire;
  }

  async getHire(hireId: string) {
    return unwrap(await apiRequest<ApiEnvelope<CommercialHireResponse>>(`/v1/hires/${encodeURIComponent(hireId)}`)).hire;
  }

  async getPayment(hireId: string) {
    return unwrap(await apiRequest<ApiEnvelope<CommercialPaymentResponse>>(`/v1/hires/${encodeURIComponent(hireId)}/payment`)).payment;
  }

  async reconcilePayment(hireId: string, input: ReconcileCommercialPaymentRequest) {
    return unwrap(await apiRequest<ApiEnvelope<CommercialPaymentResponse>>(`/v1/hires/${encodeURIComponent(hireId)}/payment/reconcile`, {
      method: "POST",
      body: JSON.stringify(input),
    })).payment;
  }

  async activate(hireId: string, input: ActivateCommercialHireRequest) {
    return unwrap(await apiRequest<ApiEnvelope<MarketplaceActivationResponse>>(`/v1/hires/${encodeURIComponent(hireId)}/activate`, {
      method: "POST",
      body: JSON.stringify(input),
    })).activation;
  }

  async getActivation(activationId: string) {
    return unwrap(await apiRequest<ApiEnvelope<MarketplaceActivationResponse>>(`/v1/activations/${encodeURIComponent(activationId)}`)).activation;
  }

  async getBuyerState(address: string) {
    return unwrap(await apiRequest<ApiEnvelope<BuyerCommercialStateResponse>>(`/v1/accounts/${encodeURIComponent(address)}/commercial-state`)).state;
  }
}

export const commercialRepository: CommercialRepository = new ApiCommercialRepository();
