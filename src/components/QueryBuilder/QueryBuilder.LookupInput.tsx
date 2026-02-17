/**
 * QueryBuilder LookupInput Component
 * 
 * Internal component for lookup field value input with automatic Web API search.
 */

import * as React from 'react';
import { Input, Text } from '@fluentui/react-components';
import { Lookup, type LookupOption } from '../Lookup';
import type { QueryBuilderLookupOption, QueryBuilderLookupTarget } from './QueryBuilder.types';

export interface LookupValueInputProps {
    fieldId: string;
    value: string;
    displayName: string;
    disabled: boolean;
    /** Target entities for the lookup (used for automatic search) */
    targets?: QueryBuilderLookupTarget[];
    onLookupSearch?: (fieldId: string, searchText: string) => Promise<QueryBuilderLookupOption[]> | QueryBuilderLookupOption[];
    onValueChange: (value: string, displayName: string) => void;
}

export const LookupValueInput: React.FC<LookupValueInputProps> = ({
    fieldId,
    value,
    displayName,
    disabled,
    targets,
    onLookupSearch,
    onValueChange,
}) => {
    const [lookupOptions, setLookupOptions] = React.useState<LookupOption[]>([]);
    const [lookupLoading, setLookupLoading] = React.useState(false);
    const [resultCount, setResultCount] = React.useState<number>(0);
    const [headerText, setHeaderText] = React.useState<string>('');

    // Automatic search using native Web API when targets are available
    const searchUsingWebApi = React.useCallback(async (searchText: string, limit: number = 15): Promise<{ results: LookupOption[]; entityDisplayName: string }> => {
        if (!targets || targets.length === 0) {
            return { results: [], entityDisplayName: '' };
        }

        const results: LookupOption[] = [];
        let entityDisplayName = '';

        // Search each target entity
        for (const target of targets) {
            if (!target.entitySetName || !target.primaryNameAttribute) continue;

            // Use entity display name for header
            if (!entityDisplayName && target.displayName) {
                entityDisplayName = target.displayName;
            }

            try {
                const nameAttr = target.primaryNameAttribute;
                let queryOptions = `$select=${nameAttr}&$top=${limit}`;

                if (searchText) {
                    queryOptions += `&$filter=contains(${nameAttr},'${searchText.replace(/'/g, "''")}')`;
                }

                const response = await fetch(`/api/data/v9.2/${target.entitySetName}?${queryOptions}`, {
                    headers: {
                        'OData-MaxVersion': '4.0',
                        'OData-Version': '4.0',
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) continue;

                const data = await response.json();
                const records = data.value || [];
                
                for (const record of records) {
                    // Extract the ID from the record (entityLogicalName + 'id')
                    const idField = `${target.entityLogicalName}id`;
                    const id = record[idField] || record.id || '';
                    const name = record[nameAttr] || 'Unnamed';

                    results.push({
                        key: id,
                        text: name,
                        secondaryText: targets.length > 1 ? target.displayName : undefined,
                    });
                }
            } catch (error) {
                console.error(`[QueryBuilder] Lookup search failed for ${target.entityLogicalName}:`, error);
            }
        }

        return { results, entityDisplayName };
    }, [targets]);

    // Load initial top 5 records when the lookup becomes usable
    React.useEffect(() => {
        const loadInitialRecords = async () => {
            const hasValidTargets = targets && targets.length > 0 && targets.some(t => t.entitySetName && t.primaryNameAttribute);
            
            // Only pre-load if we have valid targets (and no custom search)
            if (!disabled && hasValidTargets && !onLookupSearch) {
                setLookupLoading(true);
                try {
                    const searchResult = await searchUsingWebApi('', 5); // Get top 5 records
                    setLookupOptions(searchResult.results);
                    setResultCount(searchResult.results.length);
                    setHeaderText(searchResult.entityDisplayName);
                } finally {
                    setLookupLoading(false);
                }
            }
        };
        
        loadInitialRecords();
    }, [targets, disabled, onLookupSearch, searchUsingWebApi]);

    const handleSearchChange = React.useCallback(
        async (searchText: string) => {
            setLookupLoading(true);
            try {
                let results: LookupOption[];
                let entityName = '';

                if (onLookupSearch) {
                    // Use consumer-provided search function
                    const customResults = await onLookupSearch(fieldId, searchText);
                    results = customResults.map((r) => ({
                        key: r.key,
                        text: r.text,
                        secondaryText: r.secondaryText,
                    }));
                    // Use first target display name if available
                    entityName = targets?.[0]?.displayName || '';
                } else {
                    // Use native Web API search
                    const searchResult = await searchUsingWebApi(searchText);
                    results = searchResult.results;
                    entityName = searchResult.entityDisplayName;
                }

                setLookupOptions(results);
                setResultCount(results.length);
                setHeaderText(entityName);
            } finally {
                setLookupLoading(false);
            }
        },
        [fieldId, onLookupSearch, searchUsingWebApi, targets],
    );

    const handleOptionSelect = React.useCallback(
        (option: LookupOption | null) => {
            if (option) {
                onValueChange(option.key, option.text);
            } else {
                onValueChange('', '');
            }
        },
        [onValueChange],
    );

    // Determine if lookup is usable (has either onLookupSearch or valid targets)
    const hasValidTargets = targets && targets.length > 0 && targets.some(t => t.entitySetName && t.primaryNameAttribute);
    const isUsable = !disabled && (onLookupSearch || hasValidTargets);

    // If lookup metadata isn't available, show a plain input for manual GUID entry
    if (!isUsable && !disabled) {
        return (
            <Input
                size="small"
                appearance="filled-darker"
                aria-label="Lookup GUID"
                type="text"
                value={value || ''}
                onChange={(_, data) => onValueChange(data.value, displayName)}
                placeholder="Enter GUID..."
                contentAfter={
                    <Text size={100} style={{ whiteSpace: 'nowrap', color: 'var(--colorNeutralForeground3)' }}>
                        Manual entry
                    </Text>
                }
            />
        );
    }

    // Build selected option for display
    const selectedOption: LookupOption | null = value
        ? { key: value, text: displayName || value }
        : null;

    // Header showing entity type
    const header = headerText ? (
        <Text size={200} weight="semibold" style={{ padding: '4px 8px', display: 'block' }}>
            {headerText}
        </Text>
    ) : undefined;

    // Footer showing record count
    const footer = resultCount > 0 ? (
        <Text size={100} style={{ padding: '4px 8px', display: 'block', color: 'var(--colorNeutralForeground3)' }}>
            {resultCount} record{resultCount !== 1 ? 's' : ''} found
        </Text>
    ) : undefined;

    return (
        <Lookup
            size="small"
            appearance="filled-darker"
            placeholder="Search..."
            aria-label="Lookup value"
            options={lookupOptions}
            selectedOption={selectedOption}
            onSearchChange={handleSearchChange}
            onOptionSelect={handleOptionSelect}
            loading={lookupLoading}
            disabled={!isUsable}
            clearable
            minSearchLength={0}
            header={header}
            footer={footer}
        />
    );
};
