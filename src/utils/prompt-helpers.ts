/**
 * Add sequential numbers to inquirer prompt choices
 * @param choices - Array of choices to add numbers to
 * @param startFrom - Starting number (default: 1)
 * @param format - Number format function (default: "n. ")
 * @returns Choices with numbers added to their names
 */
export function addNumbersToChoices<T = any>(
  choices: Array<{ name: string; value: T; short?: string; disabled?: boolean | string }>,
  startFrom = 1,
  format: (index: number) => string = (n) => `${n}. `
): Array<{ name: string; value: T; short?: string; disabled?: boolean | string }> {
  let currentNumber = startFrom;
  
  return choices.map((choice) => {
    // Skip disabled choices
    if (choice.disabled) {
      return choice;
    }
    
    // Add number to the choice name
    const numbered = {
      ...choice,
      name: `${format(currentNumber)}${choice.name}`,
    };
    
    currentNumber++;
    return numbered;
  });
}

/**
 * Add numbers to choices with custom formatting for special items
 * Useful for menus with non-numeric options like "Q" for quit
 * @param choices - Array of choices
 * @param customFormats - Map of value to custom format
 * @returns Choices with appropriate formatting
 */
export function addCustomNumbersToChoices<T = any>(
  choices: Array<{ name: string; value: T; short?: string; disabled?: boolean | string }>,
  customFormats: Map<T, string> = new Map()
): Array<{ name: string; value: T; short?: string; disabled?: boolean | string }> {
  let currentNumber = 1;
  
  return choices.map((choice) => {
    // Skip disabled choices
    if (choice.disabled) {
      return choice;
    }
    
    // Check for custom format
    const customFormat = customFormats.get(choice.value);
    if (customFormat) {
      return {
        ...choice,
        name: `${customFormat}${choice.name}`,
      };
    }
    
    // Use standard numbering
    const numbered = {
      ...choice,
      name: `${currentNumber}. ${choice.name}`,
    };
    
    currentNumber++;
    return numbered;
  });
}