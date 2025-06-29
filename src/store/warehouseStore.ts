import { create } from 'zustand';

export interface Warehouse {
  _id: string;
  name: string;
  code: string;
  location: string;
  type: 'main' | 'secondary' | 'temporary';
  responsibleUser: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  capacity: {
    maxWeight: number;
    maxVolume: number;
    currentOccupancy: number;
  };
  zones: Array<{
    name: string;
    code: string;
    aisles: Array<{
      name: string;
      shelves: Array<{
        name: string;
        capacity: number;
        currentOccupancy: number;
      }>;
    }>;
  }>;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  specifications: {
    brand?: string;
    model?: string;
    technicalSpecs?: string;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  };
  pricing: {
    standardCost: number;
    averageCost: number;
    lastCost: number;
    currency: string;
  };
  safety: {
    isDangerous: boolean;
    hazardClass?: string;
    storageRequirements?: string;
  };
  suppliers: Array<{
    name: string;
    code: string;
    leadTime: number;
    minOrderQty: number;
  }>;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  _id: string;
  warehouse: {
    _id: string;
    name: string;
    location: string;
  };
  product: {
    _id: string;
    name: string;
    code: string;
    description: string;
    unitOfMeasure: string;
  };
  availableQuantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
  totalQuantity: number;
  averageCost: number;
  totalValue: number;
  location: {
    zone?: string;
    aisle?: string;
    shelf?: string;
    position?: string;
  };
  reorderPoint: number;
  maxStock: number;
  lastMovementDate: string;
  lastMovementBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  _id: string;
  type: 'inbound' | 'outbound' | 'adjustment';
  subtype: 'purchase_receipt' | 'transfer_in' | 'transfer_out' | 'consumption' | 'return' | 'adjustment' | 'loss';
  warehouse: {
    _id: string;
    name: string;
    location: string;
  };
  product: {
    _id: string;
    name: string;
    code: string;
  };
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference: {
    type: 'purchase_request' | 'work_order' | 'transfer' | 'adjustment';
    id: string;
    number: string;
  };
  warehouseReceipt?: string;
  performedBy: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  observations?: string;
  createdAt: string;
}

export interface WarehouseReceipt {
  _id: string;
  receiptNumber: string;
  purchaseRequest: {
    _id: string;
    requestNumber: string;
    requestDetails: {
      description: string;
    };
  };
  warehouse: {
    _id: string;
    name: string;
    location: string;
  };
  product: {
    _id: string;
    name: string;
    code: string;
  };
  items: Array<{
    _id: string;
    expectedQuantity: number;
    receivedQuantity: number;
    unitOfMeasure: string;
    unitCost: number;
    status: 'pending' | 'partial' | 'complete';
    receivedDate?: string;
    receivedBy?: string;
  }>;
  status: 'pending' | 'confirmed' | 'partial' | 'cancelled';
  observations?: string;
  finalObservations?: string;
  supplierInfo: {
    name: string;
    contact: string;
    deliveryNote?: string;
  };
  createdBy: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  confirmedBy?: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: string;
  confirmedDate?: string;
}

interface WarehouseStats {
  pendingReceipts: number;
  confirmedReceipts: number;
  productsInStock: number;
  todayMovements: number;
  pendingAssignments: number;
  totalInventoryValue: number;
}

interface WarehouseStore {
  warehouses: Warehouse[];
  products: Product[];
  stocks: Stock[];
  movements: StockMovement[];
  receipts: WarehouseReceipt[];
  pendingReceipts: any[];
  stats: WarehouseStats;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchWarehouses: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchStocks: (warehouseId?: string) => Promise<void>;
  fetchMovements: (filters?: any) => Promise<void>;
  fetchReceipts: (filters?: any) => Promise<void>;
  fetchPendingReceipts: () => Promise<void>;
  fetchStats: () => Promise<void>;
  
  createReceipt: (receiptData: any) => Promise<void>;
  confirmReceipt: (receiptId: string, receivedQuantities: {[key: string]: number}, observations?: string) => Promise<void>;
  
  createProduct: (productData: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  
  adjustStock: (stockId: string, quantity: number, reason: string) => Promise<void>;
}

const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const authData = localStorage.getItem('auth-storage');
  if (authData) {
    const { state } = JSON.parse(authData);
    if (state.token) {
      return {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
      };
    }
  }
  return {
    'Content-Type': 'application/json',
  };
};

export const useWarehouseStore = create<WarehouseStore>((set, get) => ({
  warehouses: [],
  products: [],
  stocks: [],
  movements: [],
  receipts: [],
  pendingReceipts: [],
  stats: {
    pendingReceipts: 0,
    confirmedReceipts: 0,
    productsInStock: 0,
    todayMovements: 0,
    pendingAssignments: 0,
    totalInventoryValue: 0
  },
  loading: false,
  error: null,

  fetchWarehouses: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        set({ warehouses: data.warehouses, loading: false });
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to fetch warehouses', loading: false });
      }
    } catch (error) {
      set({ error: 'Network error fetching warehouses', loading: false });
      console.error('Fetch warehouses error:', error);
    }
  },

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        set({ products: data.products, loading: false });
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to fetch products', loading: false });
      }
    } catch (error) {
      set({ error: 'Network error fetching products', loading: false });
      console.error('Fetch products error:', error);
    }
  },

  fetchStocks: async (warehouseId) => {
    set({ loading: true, error: null });
    try {
      const url = warehouseId 
        ? `${API_BASE_URL}/warehouses/${warehouseId}/stock`
        : `${API_BASE_URL}/warehouses/stock`;
        
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        set({ stocks: data.stocks, loading: false });
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to fetch stocks', loading: false });
      }
    } catch (error) {
      set({ error: 'Network error fetching stocks', loading: false });
      console.error('Fetch stocks error:', error);
    }
  },

  fetchMovements: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`${API_BASE_URL}/warehouses/movements?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        set({ movements: data.movements, loading: false });
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to fetch movements', loading: false });
      }
    } catch (error) {
      set({ error: 'Network error fetching movements', loading: false });
      console.error('Fetch movements error:', error);
    }
  },

  fetchReceipts: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`${API_BASE_URL}/warehouses/receipts?${queryParams}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        set({ receipts: data.receipts, loading: false });
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to fetch receipts', loading: false });
      }
    } catch (error) {
      set({ error: 'Network error fetching receipts', loading: false });
      console.error('Fetch receipts error:', error);
    }
  },

  fetchPendingReceipts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses/pending-receipts`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        set({ pendingReceipts: data.requests, loading: false });
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to fetch pending receipts', loading: false });
      }
    } catch (error) {
      set({ error: 'Network error fetching pending receipts', loading: false });
      console.error('Fetch pending receipts error:', error);
    }
  },

  fetchStats: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses/stats/dashboard`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        set({ stats: data.stats });
      } else {
        console.error('Failed to fetch warehouse stats');
      }
    } catch (error) {
      console.error('Fetch warehouse stats error:', error);
    }
  },

  createReceipt: async (receiptData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses/receipts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(receiptData),
      });

      if (response.ok) {
        const data = await response.json();
        set(state => ({
          receipts: [data.receipt, ...state.receipts],
          loading: false
        }));
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to create receipt', loading: false });
        throw new Error(errorData.message);
      }
    } catch (error) {
      set({ error: 'Network error creating receipt', loading: false });
      throw error;
    }
  },

  confirmReceipt: async (receiptId, receivedQuantities, observations) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses/receipts/${receiptId}/confirm`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receivedQuantities,
          observations
        }),
      });

      if (response.ok) {
        const data = await response.json();
        set(state => ({
          receipts: state.receipts.map(receipt => 
            receipt._id === receiptId ? data.receipt : receipt
          ),
          loading: false
        }));
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to confirm receipt', loading: false });
        throw new Error(errorData.message);
      }
    } catch (error) {
      set({ error: 'Network error confirming receipt', loading: false });
      throw error;
    }
  },

  createProduct: async (productData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const data = await response.json();
        set(state => ({
          products: [data.product, ...state.products],
          loading: false
        }));
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to create product', loading: false });
        throw new Error(errorData.message);
      }
    } catch (error) {
      set({ error: 'Network error creating product', loading: false });
      throw error;
    }
  },

  updateProduct: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        set(state => ({
          products: state.products.map(product => 
            product._id === id ? data.product : product
          ),
          loading: false
        }));
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to update product', loading: false });
        throw new Error(errorData.message);
      }
    } catch (error) {
      set({ error: 'Network error updating product', loading: false });
      throw error;
    }
  },

  adjustStock: async (stockId, quantity, reason) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/warehouses/stock/${stockId}/adjust`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          quantity,
          reason
        }),
      });

      if (response.ok) {
        const data = await response.json();
        set(state => ({
          stocks: state.stocks.map(stock => 
            stock._id === stockId ? data.stock : stock
          ),
          loading: false
        }));
      } else {
        const errorData = await response.json();
        set({ error: errorData.message || 'Failed to adjust stock', loading: false });
        throw new Error(errorData.message);
      }
    } catch (error) {
      set({ error: 'Network error adjusting stock', loading: false });
      throw error;
    }
  }
}));