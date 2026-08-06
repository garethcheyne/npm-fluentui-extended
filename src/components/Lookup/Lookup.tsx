import * as React from 'react';
import {
  Spinner,
  Tooltip,
  mergeClasses,
  Portal,
  useId,
  Checkbox,
} from '@fluentui/react-components';
import { DismissRegular, ChevronDownRegular, SearchRegular } from '@fluentui/react-icons';
import { useLookupStyles } from './Lookup.styles';
import { DEFAULT_FIELD_APPEARANCE } from '../../types/appearance';
import { LookupHoverCard } from './Lookup.HoverCard';
import type { LookupProps, LookupOption } from './Lookup.types';

export const Lookup: React.FC<LookupProps> = ({
  id,
  options = [],
  selectedKey,
  selectedOption: selectedOptionProp,
  onOptionSelect,
  onSearchChange,
  placeholder = 'Search...',
  loading = false,
  noResultsMessage = 'No results found',
  clearable = true,
  minSearchLength = 0,
  searchDebounceMs = 300,
  matchInputWidth = true,
  disabled,
  header,
  footer,
  open: controlledOpen,
  onOpenChange,
  disableClientFilter = false,
  // Dynamics 365 renders fields filled rather than outlined, so that is the default here
  appearance = DEFAULT_FIELD_APPEARANCE,
  entityIcon,
  entityImage,
  recordLinkAppearance = true,
  onRecordClick,
  // Size prop for matching other FluentUI controls (small = 24px, medium = 32px)
  size = 'medium',
  // Multi-select props
  showHoverCard = false,
  hoverCardColumns,
  renderHoverCard,
  hoverCardTarget = 'both',
  hoverCardDelayMs = 400,
  hoverCardActions,
  multiSelect = false,
  maxSelection,
  selectedKeys: selectedKeysProp,
  selectedOptions: selectedOptionsProp,
  onOptionsSelect,
  ...inputProps
}) => {
  const styles = useLookupStyles();
  const ariaLabel = inputProps['aria-label'];
  const ariaLabelledBy = inputProps['aria-labelledby'];

  // Generate unique ID for accessibility - use provided id or auto-generate
  const autoId = useId('lookup-');
  const lookupId = id ?? autoId;

  const [internalOpen, setInternalOpen] = React.useState(false);

  // Controlled vs uncontrolled open state
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setIsOpen = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextValue = typeof value === 'function' ? value(isOpen) : value;
      if (!isControlled) {
        setInternalOpen(nextValue);
      }
      onOpenChange?.(nextValue);
    },
    [isControlled, isOpen, onOpenChange]
  );
  const [searchText, setSearchText] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(new Set());
  const [internalSelectedOption, setInternalSelectedOption] = React.useState<LookupOption | null>(null);
  // Multi-select internal state
  const [internalSelectedOptions, setInternalSelectedOptions] = React.useState<LookupOption[]>([]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  const justSelectedRef = React.useRef(false);
  const [dropdownPosition, setDropdownPosition] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  // Track whether position has been calculated to prevent flash at 0,0
  const [dropdownPositionReady, setDropdownPositionReady] = React.useState(false);

  // Find the selected option - prefer props, fallback to internal state
  const selectedOption = React.useMemo(
    () => selectedOptionProp ?? options.find((opt) => opt.key === selectedKey) ?? internalSelectedOption,
    [selectedOptionProp, options, selectedKey, internalSelectedOption]
  );

  // Multi-select: find all selected options - prefer props, fallback to internal state
  const selectedOptions = React.useMemo<LookupOption[]>(() => {
    if (selectedOptionsProp) return selectedOptionsProp;
    if (selectedKeysProp) {
      return options.filter((opt) => selectedKeysProp.includes(opt.key));
    }
    return internalSelectedOptions;
  }, [selectedOptionsProp, selectedKeysProp, options, internalSelectedOptions]);

  // Check if an option is selected (for multi-select mode)
  const isOptionSelected = React.useCallback(
    (optionKey: string) => selectedOptions.some((opt) => opt.key === optionKey),
    [selectedOptions]
  );

  // Check if max selection reached
  const isMaxSelectionReached = React.useMemo(
    () => multiSelect && maxSelection !== undefined && maxSelection > 0 && selectedOptions.length >= maxSelection,
    [multiSelect, maxSelection, selectedOptions.length]
  );

  // Filter options based on search text (skip if disableClientFilter is true)
  const filteredOptions = React.useMemo(() => {
    // When server-side filtering is used, skip client-side filter
    if (disableClientFilter) {
      return options;
    }
    if (!searchText || searchText.length < minSearchLength) {
      return options;
    }
    const lowerSearch = searchText.toLowerCase();
    return options.filter((opt) => {
      // Check primary text
      if (opt.text.toLowerCase().includes(lowerSearch)) {
        return true;
      }
      // Check searchFields (hidden searchable content)
      if (opt.searchFields && opt.searchFields.toLowerCase().includes(lowerSearch)) {
        return true;
      }
      // Check secondaryText only if it's a string
      if (typeof opt.secondaryText === 'string') {
        return opt.secondaryText.toLowerCase().includes(lowerSearch);
      }
      return false;
    });
  }, [options, searchText, minSearchLength, disableClientFilter]);

  const highlightedOptionId = React.useMemo(() => {
    if (!isOpen || highlightedIndex < 0 || highlightedIndex >= filteredOptions.length) {
      return undefined;
    }

    return `${lookupId}-option-${filteredOptions[highlightedIndex].key}`;
  }, [filteredOptions, highlightedIndex, isOpen, lookupId]);


  /**
   * Wrap a row or badge in its hover card when one is configured for that surface.
   * Returns the element untouched otherwise, so the card is entirely opt-in and adds
   * no wrapper to the DOM when it is off.
   */
  const withHoverCard = React.useCallback(
    (option: LookupOption, element: React.ReactElement, surface: 'list' | 'rest'): React.ReactElement => {
      if (!showHoverCard) return element;
      if (hoverCardTarget !== 'both' && hoverCardTarget !== surface) return element;

      return (
        <LookupHoverCard
          // The wrapper becomes the element returned from .map(), so the key has to
          // live here - one on the child inside is invisible to React
          key={option.key}
          option={option}
          renderHoverCard={renderHoverCard}
          columns={hoverCardColumns}
          delayMs={hoverCardDelayMs}
          actions={hoverCardActions}
        >
          {element}
        </LookupHoverCard>
      );
    },
    [showHoverCard, hoverCardTarget, renderHoverCard, hoverCardColumns, hoverCardDelayMs, hoverCardActions],
  );

  // ─── Open / close helpers ────────────────────────────────────────
  const openDropdown = React.useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
  }, [disabled]);

  const closeDropdown = React.useCallback(() => {
    setIsOpen(false);
    setSearchText('');
    setHighlightedIndex(-1);
  }, []);

  // Handle search text change with debounce
  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchText(value);
      setHighlightedIndex(-1);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (onSearchChange && value.length >= minSearchLength) {
        debounceRef.current = setTimeout(() => {
          onSearchChange(value);
        }, searchDebounceMs);
      }
    },
    [onSearchChange, minSearchLength, searchDebounceMs]
  );

  // Handle input change
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      handleSearchChange(value);
      if (!isOpen) {
        openDropdown();
      }
    },
    [handleSearchChange, isOpen, openDropdown]
  );

  // Handle option selection
  const handleSelectOption = React.useCallback(
    (option: LookupOption) => {
      if (option.disabled) return;

      if (multiSelect) {
        // Multi-select mode: toggle selection
        const alreadySelected = isOptionSelected(option.key);
        
        let newSelections: LookupOption[];
        if (alreadySelected) {
          // Remove from selection
          newSelections = selectedOptions.filter((opt) => opt.key !== option.key);
        } else {
          // Add to selection (if not at max)
          if (isMaxSelectionReached) return;
          newSelections = [...selectedOptions, option];
        }
        
        setInternalSelectedOptions(newSelections);
        onOptionsSelect?.(newSelections);
        // Keep dropdown open in multi-select mode
        setSearchText('');
        inputRef.current?.focus();
      } else {
        // Single-select mode
        justSelectedRef.current = true;
        setInternalSelectedOption(option);
        onOptionSelect?.(option);
        setSearchText('');
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
      }
    },
    [multiSelect, isOptionSelected, selectedOptions, isMaxSelectionReached, onOptionsSelect, onOptionSelect]
  );

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            openDropdown();
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleSelectOption(filteredOptions[highlightedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          closeDropdown();
          break;

        case 'Tab':
          closeDropdown();
          break;
      }
    },
    [disabled, isOpen, highlightedIndex, filteredOptions, handleSelectOption, openDropdown, closeDropdown]
  );

  // Handle input focus — open the dropdown
  const handleFocus = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (!disabled) {
        // Don't reopen if we just selected an option
        if (justSelectedRef.current) {
          justSelectedRef.current = false;
          return;
        }
        openDropdown();
      }
      // Forward to consumer's onFocus if provided
      inputProps.onFocus?.(e);
    },
    [disabled, openDropdown, inputProps.onFocus]
  );

  // Handle click on the wrapper — also opens (in case focus doesn't fire
  // because the input is already focused, e.g. clicking the chevron area)
  const handleWrapperClick = React.useCallback(() => {
    if (!disabled && !isOpen) {
      openDropdown();
      inputRef.current?.focus();
    }
  }, [disabled, isOpen, openDropdown]);

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const option = dropdownRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      );
      option?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // ─── Position the dropdown below the input ─────────────────────
  React.useEffect(() => {
    if (!isOpen) {
      // Reset position ready state when dropdown closes
      setDropdownPositionReady(false);
      return;
    }

    const updatePosition = () => {
      const rect = inputWrapperRef.current?.getBoundingClientRect();
      if (rect) {
        // Use ownerDocument's window for scroll offsets (cross-document safe)
        const ownerWin = inputWrapperRef.current?.ownerDocument?.defaultView ?? window;
        setDropdownPosition({
          top: rect.bottom + 4 + ownerWin.scrollY,
          left: rect.left + ownerWin.scrollX,
          width: matchInputWidth ? rect.width : 0,
        });
        // Mark position as ready after first calculation
        setDropdownPositionReady(true);
      }
    };

    updatePosition();

    // Track input resize (e.g. flex/grid layout changes)
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && inputWrapperRef.current) {
      resizeObserver = new ResizeObserver(() => updatePosition());
      resizeObserver.observe(inputWrapperRef.current);
    }

    // Use the ownerDocument's window for event listeners.
    // In cross-document scenarios (e.g., D365 iframes where React mounts
    // into the top window's document), the global `window` refers to the
    // iframe window, but events fire on the top window where the DOM lives.
    const ownerWin = inputWrapperRef.current?.ownerDocument?.defaultView ?? window;

    // Track window resize
    ownerWin.addEventListener('resize', updatePosition);

    // Track any scroll so the portal follows the input
    ownerWin.addEventListener('scroll', updatePosition, true);

    return () => {
      resizeObserver?.disconnect();
      ownerWin.removeEventListener('resize', updatePosition);
      ownerWin.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, matchInputWidth]);

  // ─── Close when clicking outside ───────────────────────────────
  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const insideInput = inputWrapperRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideInput && !insideDropdown) {
        closeDropdown();
      }
    };

    // Use ownerDocument instead of the global `document`.
    // In cross-document scenarios (e.g., D365 iframes where React renders
    // into the top window's document), the global `document` refers to the
    // iframe's document, but mousedown events fire on the top document
    // where the actual DOM elements live. Using ownerDocument ensures the
    // listener is on the correct document.
    //
    // Uses capture phase (true) so that stopPropagation() calls by host
    // applications (e.g., Dynamics 365) cannot prevent the handler from firing.
    const ownerDoc = inputWrapperRef.current?.ownerDocument ?? document;
    ownerDoc.addEventListener('mousedown', handlePointerDownOutside, true);

    return () => {
      ownerDoc.removeEventListener('mousedown', handlePointerDownOutside, true);
    };
  }, [isOpen, closeDropdown]);

  const showDropdown = isOpen && !disabled;

  // Determine which items to show as badges (both single and multi-select)
  // When maxSelection is set, show only up to maxSelection badges and indicate overflow
  const visibleBadgeCount = maxSelection && maxSelection > 0 ? Math.min(maxSelection, 3) : undefined;
  const allBadgeItems: LookupOption[] = multiSelect
    ? selectedOptions
    : selectedOption
    ? [selectedOption]
    : [];
  const badgeItems = visibleBadgeCount !== undefined && allBadgeItems.length > visibleBadgeCount
    ? allBadgeItems.slice(0, visibleBadgeCount)
    : allBadgeItems;
  const overflowCount = allBadgeItems.length - badgeItems.length;

  // Should we show the input field? In single-select at-rest, we might hide the text input
  // In multi-select or when searching, always show
  const showTextInput = multiSelect || isOpen || !selectedOption;
  const isSingleSelectAtRest = !multiSelect && !showTextInput;
  const canAutoNavigateRecord = React.useCallback(
    (option: LookupOption) => Boolean(option.entityName && (option.recordId ?? option.key)),
    [],
  );
  const handleRecordActivate = React.useCallback(
    (option: LookupOption) => {
      if (onRecordClick) {
        onRecordClick(option);
        return;
      }

      const entityName = option.entityName;
      const recordId = option.recordId ?? option.key;
      if (!entityName || !recordId || typeof window === 'undefined') return;

      const xrm = (window as Window & {
        Xrm?: {
          Navigation?: {
            openForm?: (options: { entityName: string; entityId: string }) => unknown;
          };
        };
      }).Xrm;

      if (xrm?.Navigation?.openForm) {
        void xrm.Navigation.openForm({ entityName, entityId: recordId });
        return;
      }

      const url = new URL('/main.aspx', window.location.origin);
      url.searchParams.set('pagetype', 'entityrecord');
      url.searchParams.set('etn', entityName);
      url.searchParams.set('id', recordId);
      window.location.assign(url.toString());
    },
    [onRecordClick],
  );
  const hasRestHoverCard = React.useCallback(
    (option: LookupOption) => {
      if (!showHoverCard) return false;
      if (hoverCardTarget !== 'both' && hoverCardTarget !== 'rest') return false;
      if (renderHoverCard) return true;

      const recordId = option.recordId ?? option.key;
      return Boolean(option.entityName && recordId);
    },
    [showHoverCard, hoverCardTarget, renderHoverCard],
  );

  // Helper to remove a badge (works for both single and multi)
  const handleBadgeDismiss = React.useCallback(
    (optionKey: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (multiSelect) {
        const newSelections = selectedOptions.filter((opt) => opt.key !== optionKey);
        setInternalSelectedOptions(newSelections);
        onOptionsSelect?.(newSelections);
      } else {
        setInternalSelectedOption(null);
        onOptionSelect?.(null);
      }
      inputRef.current?.focus();
    },
    [multiSelect, selectedOptions, onOptionsSelect, onOptionSelect]
  );

  return (
    <div className={styles.root}>
      <div
        className={mergeClasses(
          styles.tagInputWrapper,
          appearance === 'filled-darker' || appearance === 'filled-lighter'
            ? styles.tagInputWrapperFilled
            : undefined,
          size === 'small' ? styles.tagInputWrapperSmall : undefined,
          disabled ? styles.tagInputWrapperDisabled : undefined
        )}
        ref={inputWrapperRef}
        onClick={handleWrapperClick}
      >
        {/* Badges area - contains selected items as badges */}
        <div className={styles.tagInputBadgesArea}>
          {badgeItems.map((opt) => withHoverCard(
            opt,
            <span
              key={opt.key}
              className={mergeClasses(
                styles.inlineBadge,
                isSingleSelectAtRest && styles.inlineBadgeSingle,
              )}
            >
              {/* Entity icon/image */}
              {(entityImage || entityIcon || opt.icon) && (
                <span className={styles.inlineBadgeIcon}>
                  {entityImage ? (
                    <img
                      src={entityImage}
                      alt=""
                      style={{ width: '16px', height: '16px', borderRadius: '2px', objectFit: 'cover' }}
                    />
                  ) : (
                    entityIcon ?? opt.icon
                  )}
                </span>
              )}
              {hasRestHoverCard(opt) ? (
                <span
                  className={mergeClasses(
                    styles.inlineBadgeText,
                    recordLinkAppearance === false && styles.inlineBadgeTextPlain,
                  )}
                  // Clicking a resolved record opens it, the way a Dynamics lookup does.
                  // Without a handler the click falls through to the wrapper and opens
                  // the dropdown, so the link styling is never a dead end.
                  onClick={
                    (onRecordClick || canAutoNavigateRecord(opt))
                      ? (event) => {
                          event.stopPropagation();
                          handleRecordActivate(opt);
                        }
                      : undefined
                  }
                  role={onRecordClick || canAutoNavigateRecord(opt) ? 'link' : undefined}
                  tabIndex={onRecordClick || canAutoNavigateRecord(opt) ? 0 : undefined}
                  onKeyDown={
                    (onRecordClick || canAutoNavigateRecord(opt))
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            handleRecordActivate(opt);
                          }
                        }
                      : undefined
                  }
                >
                  {opt.text}
                </span>
              ) : (
                <Tooltip content={opt.text} relationship="label" withArrow>
                  <span
                    className={mergeClasses(
                      styles.inlineBadgeText,
                      recordLinkAppearance === false && styles.inlineBadgeTextPlain,
                    )}
                    // Clicking a resolved record opens it, the way a Dynamics lookup does.
                    // Without a handler the click falls through to the wrapper and opens
                    // the dropdown, so the link styling is never a dead end.
                    onClick={
                      (onRecordClick || canAutoNavigateRecord(opt))
                        ? (event) => {
                            event.stopPropagation();
                            handleRecordActivate(opt);
                          }
                        : undefined
                    }
                    role={onRecordClick || canAutoNavigateRecord(opt) ? 'link' : undefined}
                    tabIndex={onRecordClick || canAutoNavigateRecord(opt) ? 0 : undefined}
                    onKeyDown={
                      (onRecordClick || canAutoNavigateRecord(opt))
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRecordActivate(opt);
                            }
                          }
                        : undefined
                    }
                  >
                    {opt.text}
                  </span>
                </Tooltip>
              )}
              {!disabled && clearable && (
                <button
                  type="button"
                  className={styles.inlineBadgeDismiss}
                  onClick={(e) => handleBadgeDismiss(opt.key, e)}
                  aria-label={`Remove ${opt.text}`}
                >
                  <DismissRegular fontSize={12} />
                </button>
              )}
            </span>,
            'rest',
          ))}

          {/* Overflow indicator when maxSelection limits visible badges */}
          {overflowCount > 0 && (
            <span className={styles.overflowBadge} title={`${overflowCount} more selected`}>
              +{overflowCount}
            </span>
          )}

          {/* Text input for searching */}
          {(showTextInput || badgeItems.length === 0) && (
            <input
              id={lookupId}
              ref={inputRef}
              type="text"
              className={styles.tagInputField}
              value={searchText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder={badgeItems.length > 0 ? '' : placeholder}
              disabled={disabled}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls={isOpen ? `${lookupId}-listbox` : undefined}
              aria-autocomplete="list"
              aria-activedescendant={highlightedOptionId}
              aria-label={ariaLabelledBy ? undefined : ariaLabel ?? placeholder ?? 'Lookup'}
            />
          )}
        </div>

        {/* Icons on the right */}
        <span className={styles.tagInputIcons}>
          {loading ? (
            <Spinner size="tiny" />
          ) : (
            <span className={styles.chevronIcon}>
              <SearchRegular />
            </span>
          )}
        </span>
      </div>

      {showDropdown && (
        <Portal>
          <div
            className={styles.dropdownPortal}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              // Hide until position is calculated to prevent flash at 0,0
              visibility: dropdownPositionReady ? 'visible' : 'hidden',
              ...(matchInputWidth && dropdownPosition.width > 0
                ? { width: dropdownPosition.width }
                : { minWidth: 220 }),
            }}
          >
            <div
              id={`${lookupId}-listbox`}
              className={styles.dropdownContent}
              ref={dropdownRef}
              role="listbox"
              aria-labelledby={lookupId}
            >
              {header && (
                <div className={styles.headerWrapper}>
                  <div className={styles.header}>{header}</div>
                </div>
              )}
              {loading ? (
                <div className={styles.loadingContainer}>
                  <Spinner size="small" label="Loading..." />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className={styles.noResults}>{noResultsMessage}</div>
              ) : (
                <div className={styles.optionsContainer}>
                  <div className={styles.optionsList}>
                    {filteredOptions.map((option, index) => {
                      const isExpanded = expandedKeys.has(option.key);
                      const hasDetails = option.details && option.details.length > 0;
                      const isSelected = multiSelect
                        ? isOptionSelected(option.key)
                        : option.key === selectedOption?.key;
                      // In multiSelect mode, disable option if max reached and not already selected
                      const isDisabledByMax = multiSelect && isMaxSelectionReached && !isSelected;

                      const handleExpandClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setExpandedKeys((prev) => {
                          const next = new Set(prev);
                          if (next.has(option.key)) {
                            next.delete(option.key);
                          } else {
                            next.add(option.key);
                          }
                          return next;
                        });
                      };

                      return withHoverCard(
                        option,
                        <div
                          key={option.key}
                          id={`${lookupId}-option-${option.key}`}
                          role="option"
                          data-index={index}
                          aria-selected={isSelected}
                          aria-disabled={option.disabled || isDisabledByMax || undefined}
                          className={mergeClasses(
                            styles.option,
                            index === highlightedIndex && styles.optionHighlighted,
                            isSelected && styles.optionSelected,
                            (option.disabled || isDisabledByMax) && styles.optionDisabled
                          )}
                          onClick={() => handleSelectOption(option)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          {/* Show checkbox in multiSelect mode */}
                          {multiSelect && (
                            <span className={mergeClasses(
                              styles.optionCheckbox,
                              !!option.secondaryText && styles.optionCheckboxWithSecondary
                            )}>
                              <Checkbox
                                checked={isSelected}
                                disabled={option.disabled || isDisabledByMax}
                                onChange={() => {/* handled by parent onClick */}}
                                tabIndex={-1}
                              />
                            </span>
                          )}
                          {option.icon && (
                            <span className={mergeClasses(
                              styles.optionIcon,
                              !!option.secondaryText && styles.optionIconWithSecondary
                            )}>{option.icon}</span>
                          )}
                          <span className={styles.optionContent}>
                            <span className={styles.optionText}>{option.text}</span>
                            {option.secondaryText && (
                              <span className={styles.optionSecondaryText}>
                                {option.secondaryText}
                              </span>
                            )}
                            {isExpanded && hasDetails && (
                              <div className={styles.optionDetails}>
                                {option.details!.map((detail, detailIndex) => (
                                  <div key={detailIndex} className={styles.optionDetailRow}>
                                    {detail.label && (
                                      <span className={styles.optionDetailLabel}>
                                        {detail.label}:
                                      </span>
                                    )}
                                    <span className={styles.optionDetailValue}>
                                      {detail.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </span>
                          {hasDetails && (
                            <span
                              role="button"
                              tabIndex={-1}
                              className={mergeClasses(
                                styles.optionExpandButton,
                                isExpanded && styles.optionExpandButtonExpanded
                              )}
                              onClick={handleExpandClick}
                              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              <ChevronDownRegular />
                            </span>
                          )}
                        </div>,
                        'list',
                      );
                    })}
                  </div>
                </div>
              )}
              {footer && (
                <div className={styles.footerWrapper}>
                  <div className={styles.footer}>{footer}</div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

Lookup.displayName = 'Lookup';
