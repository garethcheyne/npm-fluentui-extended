import * as React from 'react';
import {
  Input,
  Spinner,
  mergeClasses,
  Button,
} from '@fluentui/react-components';
import { SearchRegular, DismissRegular, ChevronDownRegular } from '@fluentui/react-icons';
import { useLookupStyles } from './Lookup.styles';
import type { LookupProps, LookupOption } from './Lookup.types';

export const Lookup: React.FC<LookupProps> = ({
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
  disabled,
  header,
  footer,
  ...inputProps
}) => {
  const styles = useLookupStyles();

  const [isOpen, setIsOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(new Set());
  const [internalSelectedOption, setInternalSelectedOption] = React.useState<LookupOption | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  const justSelectedRef = React.useRef(false);

  // Find the selected option - prefer props, fallback to internal state
  const selectedOption = React.useMemo(
    () => selectedOptionProp ?? options.find((opt) => opt.key === selectedKey) ?? internalSelectedOption,
    [selectedOptionProp, options, selectedKey, internalSelectedOption]
  );

  // Filter options based on search text
  const filteredOptions = React.useMemo(() => {
    if (!searchText || searchText.length < minSearchLength) {
      return options;
    }
    const lowerSearch = searchText.toLowerCase();
    return options.filter(
      (opt) =>
        opt.text.toLowerCase().includes(lowerSearch) ||
        opt.secondaryText?.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchText, minSearchLength]);

  // Display value in input
  const displayValue = React.useMemo(() => {
    if (isOpen) {
      return searchText;
    }
    return selectedOption?.text ?? '';
  }, [isOpen, searchText, selectedOption]);

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
        setIsOpen(true);
      }
    },
    [handleSearchChange, isOpen]
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
            setIsOpen(true);
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
          setIsOpen(false);
          setSearchText('');
          setHighlightedIndex(-1);
          break;

        case 'Tab':
          setIsOpen(false);
          setSearchText('');
          break;
      }
    },
    [disabled, isOpen, highlightedIndex, filteredOptions, handleSelectOption]
  );

  // Handle input focus
  const handleFocus = React.useCallback(() => {
    if (!disabled) {
      // Don't reopen if we just selected an option
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      setIsOpen(true);
    }
  }, [disabled]);

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchText('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div className={styles.root}>
      <div className={styles.inputWrapper}>
        <Input
          {...inputProps}
          ref={inputRef}
          className={mergeClasses(styles.input, inputProps.className)}
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
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

      {isOpen && !disabled && (
        <div className={styles.dropdown} ref={dropdownRef} role="listbox">
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
              <ul className={styles.optionsList}>
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
                    <li key={option.key}>
                      <button
                        type="button"
                        role="option"
                        data-index={index}
                        aria-selected={option.key === selectedKey}
                        aria-disabled={option.disabled}
                        className={mergeClasses(
                          styles.option,
                          index === highlightedIndex && styles.optionHighlighted,
                          option.key === selectedKey && styles.optionSelected,
                          option.disabled && styles.optionDisabled
                        )}
                        onClick={() => handleSelectOption(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        {option.icon && (
                          <span className={styles.optionIcon}>{option.icon}</span>
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
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {footer && (
            <div className={styles.footerWrapper}>
              <div className={styles.footer}>{footer}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

Lookup.displayName = 'Lookup';
