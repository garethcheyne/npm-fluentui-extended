import * as React from 'react';
import {
  Input,
  Spinner,
  mergeClasses,
  Button,
  Portal,
  useId,
} from '@fluentui/react-components';
import { DismissRegular, ChevronDownRegular } from '@fluentui/react-icons';
import { useLookupStyles } from './Lookup.styles';
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

  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  const justSelectedRef = React.useRef(false);
  const [dropdownPosition, setDropdownPosition] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  // Find the selected option - prefer props, fallback to internal state
  const selectedOption = React.useMemo(
    () => selectedOptionProp ?? options.find((opt) => opt.key === selectedKey) ?? internalSelectedOption,
    [selectedOptionProp, options, selectedKey, internalSelectedOption]
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

  // Display value in input
  const displayValue = React.useMemo(() => {
    if (isOpen) {
      return searchText;
    }
    return selectedOption?.text ?? '';
  }, [isOpen, searchText, selectedOption]);

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

      justSelectedRef.current = true;
      setInternalSelectedOption(option);
      onOptionSelect?.(option);
      setSearchText('');
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onOptionSelect]
  );

  // Handle clear
  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setInternalSelectedOption(null);
      onOptionSelect?.(null);
      setSearchText('');
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onOptionSelect]
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
    if (!isOpen) return;

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

  return (
    <div className={styles.root}>
      <div
        className={styles.inputWrapper}
        ref={inputWrapperRef}
        onClick={handleWrapperClick}
      >
        <Input
          {...inputProps}
          id={lookupId}
          ref={inputRef}
          className={mergeClasses(styles.input, inputProps.className)}
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? `${lookupId}-listbox` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={highlightedOptionId}
          aria-label={ariaLabelledBy ? undefined : ariaLabel ?? placeholder ?? 'Lookup'}
          contentAfter={
            <span className={styles.iconContainer}>
              {clearable && selectedOption && !disabled && (
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<DismissRegular />}
                  onClick={handleClear}
                  className={styles.iconButton}
                  aria-label="Clear selection"
                />
              )}
              {loading ? (
                <Spinner size="tiny" />
              ) : (
                <span className={styles.chevronIcon}>
                  <ChevronDownRegular />
                </span>
              )}
            </span>
          }
        />
      </div>

      {showDropdown && (
        <Portal>
          <div
            className={styles.dropdownPortal}
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
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

                      return (
                        <div
                          key={option.key}
                          id={`${lookupId}-option-${option.key}`}
                          role="option"
                          data-index={index}
                          aria-selected={option.key === selectedOption?.key}
                          aria-disabled={option.disabled || undefined}
                          className={mergeClasses(
                            styles.option,
                            index === highlightedIndex && styles.optionHighlighted,
                            option.key === selectedOption?.key && styles.optionSelected,
                            option.disabled && styles.optionDisabled
                          )}
                          onClick={() => handleSelectOption(option)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
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
                        </div>
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
