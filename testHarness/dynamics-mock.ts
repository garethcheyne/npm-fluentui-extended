/**
 * Mock Xrm object that connects to a real Dynamics 365 instance
 * Uses service principal (client credentials) for authentication
 *
 * This mock provides data in the same format as the real Xrm.Utility.getEntityMetadata
 */

// Read config from environment
const DYNAMICS_URL = (import.meta.env.VITE_DYNAMICS_URL as string)?.replace(/\/$/, '');
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID as string;
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID as string;
const CLIENT_SECRET = import.meta.env.VITE_AZURE_CLIENT_SECRET as string;

// Validate configuration
const isConfigured = !!(
  DYNAMICS_URL &&
  CLIENT_ID &&
  TENANT_ID &&
  CLIENT_SECRET &&
  !DYNAMICS_URL.includes('yourorg') &&
  !CLIENT_ID.includes('your-azure') &&
  !CLIENT_SECRET.includes('your-client-secret')
);

// Connection state (persisted in sessionStorage)
const CONNECTION_KEY = 'dynamics_connected';
let isConnected = sessionStorage.getItem(CONNECTION_KEY) === 'true';

// Verify connection by getting a token from the server
const verifyConnection = async (): Promise<boolean> => {
  const response = await fetch('/api/dynamics-token');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to connect');
  }

  isConnected = true;
  sessionStorage.setItem(CONNECTION_KEY, 'true');
  return true;
};

// Call Dynamics Web API via server proxy (avoids CORS issues)
const callDynamicsApi = async <T>(endpoint: string): Promise<T> => {
  const url = `/api/dynamics/${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Dynamics API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Fetch entity metadata matching the format returned by Xrm.Utility.getEntityMetadata
 */
const getEntityMetadata = async (entityName: string): Promise<any> => {
  console.log(`[Dynamics] Fetching metadata for: ${entityName}`);

  // Fetch all picklist-type attributes with their options in one call
  const picklistQuery = `EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName,SchemaName,AttributeType,DisplayName&$expand=OptionSet($select=Options)`;
  const stateQuery = `EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.StateAttributeMetadata?$select=LogicalName,SchemaName,AttributeType,DisplayName&$expand=OptionSet($select=Options)`;
  const statusQuery = `EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$select=LogicalName,SchemaName,AttributeType,DisplayName&$expand=OptionSet($select=Options)`;
  const booleanQuery = `EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$select=LogicalName,SchemaName,AttributeType,DisplayName&$expand=OptionSet($select=TrueOption,FalseOption)`;
  // Fetch Lookup attributes with Targets array
  const lookupQuery = `EntityDefinitions(LogicalName='${entityName}')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,SchemaName,AttributeType,DisplayName,Targets`;
  const otherQuery = `EntityDefinitions(LogicalName='${entityName}')?$select=LogicalName,EntitySetName,DisplayName&$expand=Attributes($filter=IsValidForAdvancedFind/Value eq true;$select=LogicalName,SchemaName,AttributeType,DisplayName)`;

  // Fetch all in parallel
  const [picklistData, stateData, statusData, booleanData, lookupData, entityData] = await Promise.all([
    callDynamicsApi<any>(picklistQuery).catch(() => ({ value: [] })),
    callDynamicsApi<any>(stateQuery).catch(() => ({ value: [] })),
    callDynamicsApi<any>(statusQuery).catch(() => ({ value: [] })),
    callDynamicsApi<any>(booleanQuery).catch(() => ({ value: [] })),
    callDynamicsApi<any>(lookupQuery).catch(() => ({ value: [] })),
    callDynamicsApi<any>(otherQuery),
  ]);

  // Get unique target entities to fetch their metadata
  const targetEntities = new Set<string>();
  for (const attr of lookupData.value || []) {
    if (Array.isArray(attr.Targets)) {
      for (const target of attr.Targets) {
        targetEntities.add(target);
      }
    }
  }

  // Fetch entity metadata for all lookup targets (for EntitySetName and PrimaryNameAttribute)
  const targetMetadataMap: Record<string, { entitySetName: string; primaryNameAttribute: string; displayName: string }> = {};
  if (targetEntities.size > 0) {
    const targetQueries = Array.from(targetEntities).map(async (targetEntity) => {
      try {
        const meta = await callDynamicsApi<any>(
          `EntityDefinitions(LogicalName='${targetEntity}')?$select=LogicalName,EntitySetName,PrimaryNameAttribute,DisplayName`
        );
        targetMetadataMap[targetEntity] = {
          entitySetName: meta.EntitySetName,
          primaryNameAttribute: meta.PrimaryNameAttribute,
          displayName: meta.DisplayName?.UserLocalizedLabel?.Label || targetEntity,
        };
      } catch {
        // Skip unavailable targets
      }
    });
    await Promise.all(targetQueries);
  }

  // Build attributes collection in Xrm format
  const attributesCollection: Record<string, any> = {};

  // Helper to transform options to Xrm format
  const transformOptions = (options: any[]) => {
    if (!Array.isArray(options)) return undefined;
    return {
      Options: options.map((opt: any) => ({
        Value: opt.Value,
        Label: {
          UserLocalizedLabel: {
            Label: opt.Label?.UserLocalizedLabel?.Label || String(opt.Value),
          },
        },
      })),
    };
  };

  // Process picklist attributes (with options)
  for (const attr of picklistData.value || []) {
    attributesCollection[attr.LogicalName] = {
      LogicalName: attr.LogicalName,
      SchemaName: attr.SchemaName,
      AttributeType: attr.AttributeType,
      DisplayName: attr.DisplayName,
      IsValidForAdvancedFind: true,
      OptionSet: transformOptions(attr.OptionSet?.Options),
    };
  }

  // Process state attributes (with options)
  for (const attr of stateData.value || []) {
    attributesCollection[attr.LogicalName] = {
      LogicalName: attr.LogicalName,
      SchemaName: attr.SchemaName,
      AttributeType: attr.AttributeType,
      DisplayName: attr.DisplayName,
      IsValidForAdvancedFind: true,
      OptionSet: transformOptions(attr.OptionSet?.Options),
    };
  }

  // Process status attributes (with options)
  for (const attr of statusData.value || []) {
    attributesCollection[attr.LogicalName] = {
      LogicalName: attr.LogicalName,
      SchemaName: attr.SchemaName,
      AttributeType: attr.AttributeType,
      DisplayName: attr.DisplayName,
      IsValidForAdvancedFind: true,
      OptionSet: transformOptions(attr.OptionSet?.Options),
    };
  }

  // Process boolean attributes (with Yes/No options)
  for (const attr of booleanData.value || []) {
    const trueOption = attr.OptionSet?.TrueOption;
    const falseOption = attr.OptionSet?.FalseOption;
    attributesCollection[attr.LogicalName] = {
      LogicalName: attr.LogicalName,
      SchemaName: attr.SchemaName,
      AttributeType: attr.AttributeType,
      DisplayName: attr.DisplayName,
      IsValidForAdvancedFind: true,
      OptionSet: {
        Options: [
          {
            Value: trueOption?.Value ?? 1,
            Label: {
              UserLocalizedLabel: {
                Label: trueOption?.Label?.UserLocalizedLabel?.Label || 'Yes',
              },
            },
          },
          {
            Value: falseOption?.Value ?? 0,
            Label: {
              UserLocalizedLabel: {
                Label: falseOption?.Label?.UserLocalizedLabel?.Label || 'No',
              },
            },
          },
        ],
      },
    };
  }

  // Process lookup attributes (with Targets)
  for (const attr of lookupData.value || []) {
    const targets = Array.isArray(attr.Targets) 
      ? attr.Targets.map((targetEntity: string) => {
          const meta = targetMetadataMap[targetEntity];
          return {
            entityLogicalName: targetEntity,
            entitySetName: meta?.entitySetName,
            displayName: meta?.displayName || targetEntity,
            primaryNameAttribute: meta?.primaryNameAttribute,
          };
        })
      : [];
    
    attributesCollection[attr.LogicalName] = {
      LogicalName: attr.LogicalName,
      SchemaName: attr.SchemaName,
      AttributeType: attr.AttributeType,
      DisplayName: attr.DisplayName,
      IsValidForAdvancedFind: true,
      Targets: targets,
    };
  }

  // Add remaining attributes (string, number, datetime, etc.)
  for (const attr of entityData.Attributes || []) {
    // Skip if already processed (picklist/state/status/boolean/lookup)
    if (attributesCollection[attr.LogicalName]) continue;

    attributesCollection[attr.LogicalName] = {
      LogicalName: attr.LogicalName,
      SchemaName: attr.SchemaName,
      AttributeType: attr.AttributeType,
      DisplayName: attr.DisplayName,
      IsValidForAdvancedFind: true,
    };
  }

  const fieldCount = Object.keys(attributesCollection).length;
  const optionSetCount = Object.values(attributesCollection).filter((a: any) => a.OptionSet?.Options?.length > 0).length;
  const lookupCount = Object.values(attributesCollection).filter((a: any) => a.Targets?.length > 0).length;
  console.log(`[Dynamics] Loaded ${fieldCount} fields (${optionSetCount} with options, ${lookupCount} lookups with targets)`);

  return {
    LogicalName: entityData.LogicalName,
    EntitySetName: entityData.EntitySetName,
    DisplayName: entityData.DisplayName,
    Attributes: {
      _collection: attributesCollection,
    },
  };
};

// Mock Xrm global object
export const mockXrm = {
  Utility: {
    getEntityMetadata: async (entityName: string, _attributes?: string[]) => {
      return getEntityMetadata(entityName);
    },
  },
  WebApi: {
    retrieveMultipleRecords: async (entitySetName: string, options?: string) => {
      console.log(`[Dynamics] Query: ${entitySetName}`, options);
      const query = options ? `${entitySetName}${options}` : entitySetName;
      return callDynamicsApi(query);
    },
  },
};

// Install mock on window
export const installDynamicsMock = async (): Promise<{ isConfigured: boolean; isAuthenticated: boolean }> => {
  if (!isConfigured) {
    console.warn('[Dynamics] Not configured. Set environment variables in .env');
    return { isConfigured: false, isAuthenticated: false };
  }

  (window as any).Xrm = mockXrm;
  console.log('[Dynamics] Mock installed. Target:', DYNAMICS_URL);

  // Auto-reconnect if we had a previous session
  if (isConnected) {
    try {
      await verifyConnection();
      console.log('[Dynamics] Reconnected from previous session');
    } catch {
      // Session expired, clear state
      isConnected = false;
      sessionStorage.removeItem(CONNECTION_KEY);
    }
  }

  return { isConfigured: true, isAuthenticated: isConnected };
};

// Connect to Dynamics
export const loginToDynamics = async (): Promise<boolean> => {
  if (!isConfigured) return false;

  try {
    await verifyConnection();
    (window as any).Xrm = mockXrm;
    console.log('[Dynamics] Connected successfully');
    return true;
  } catch (error) {
    console.error('[Dynamics] Connection failed:', error);
    return false;
  }
};

export const isDynamicsAuthenticated = (): boolean => isConnected;

export const getDynamicsUser = (): { name: string; username: string } | null => {
  if (!isConnected) return null;
  return { name: 'Service Principal', username: CLIENT_ID };
};

export const logoutFromDynamics = async (): Promise<void> => {
  isConnected = false;
  sessionStorage.removeItem(CONNECTION_KEY);
};
