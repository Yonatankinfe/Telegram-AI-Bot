const { isValidDate, isAdmin, parseDate, allowedAdmins: actualAllowedAdmins } = require('../index.js');

describe('Utility Functions', () => {
  describe('isValidDate', () => {
    test('should return true for a valid date', () => {
      expect(isValidDate('01/12/2024')).toBe(true);
    });

    test('should return false for invalid format (YYYY-MM-DD)', () => {
      expect(isValidDate('2024-12-01')).toBe(false);
    });

    test('should return false for day out of range', () => {
      expect(isValidDate('32/12/2024')).toBe(false);
    });
    
    test('should return false for 31st of April', () => {
      expect(isValidDate('31/04/2024')).toBe(false);
    });

    test('should return false for month out of range', () => {
      expect(isValidDate('01/13/2024')).toBe(false);
    });

    test('should return false for non-numeric input', () => {
      expect(isValidDate('dd/mm/yyyy')).toBe(false);
    });

    test('should return true for February 29 on a leap year (2024)', () => {
      expect(isValidDate('29/02/2024')).toBe(true);
    });
    
    test('should return true for February 29 on a leap year (2000, century leap year)', () => {
      expect(isValidDate('29/02/2000')).toBe(true);
    });

    test('should return false for February 29 on a non-leap year (2023)', () => {
      expect(isValidDate('29/02/2023')).toBe(false);
    });

    test('should return false for February 29 on a non-leap year (1900, century non-leap year)', () => {
      expect(isValidDate('29/02/1900')).toBe(false);
    });

    test('should return false for invalid day (00/01/2023)', () => {
      expect(isValidDate('00/01/2023')).toBe(false);
    });

    test('should return false for invalid month (01/00/2023)', () => {
      expect(isValidDate('01/00/2023')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    // Using the actualAllowedAdmins exported from index.js for the tests
    const testAdminId = actualAllowedAdmins.length > 0 ? actualAllowedAdmins[0] : 123456789; // Use first admin or default
    
    test('should return true for an admin user ID', () => {
      expect(isAdmin(testAdminId)).toBe(true);
    });

    test('should return true for another admin user ID if more than one exists', () => {
      if (actualAllowedAdmins.length > 1) {
        expect(isAdmin(actualAllowedAdmins[1])).toBe(true);
      } else {
        // If only one admin, this test is effectively the same as the one above or can be skipped.
        // For now, let's ensure it doesn't fail if there's only one admin.
        expect(true).toBe(true); // Placeholder if only one admin
      }
    });

    test('should return false for a non-admin user ID', () => {
      const nonAdminId = 11111;
      // Ensure nonAdminId is not in actualAllowedAdmins
      expect(actualAllowedAdmins.includes(nonAdminId)).toBe(false); 
      expect(isAdmin(nonAdminId)).toBe(false);
    });

     test('should return false for undefined or null chatId', () => {
      expect(isAdmin(undefined)).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('parseDate', () => {
    test('should correctly parse a valid date string (01/12/2024)', () => {
      const date = parseDate('01/12/2024');
      expect(date).not.toBeNull();
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(11); // Month is 0-indexed
      expect(date.getDate()).toBe(1);
    });

    test('should correctly parse February 29 on a leap year (29/02/2024)', () => {
      const date = parseDate('29/02/2024');
      expect(date).not.toBeNull();
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(1); // Month is 0-indexed
      expect(date.getDate()).toBe(29);
    });

    test('should return null for an invalid date string (31/04/2024)', () => {
      expect(parseDate('31/04/2024')).toBeNull();
    });
    
    test('should return null for an invalid date format', () => {
      expect(parseDate('2024-12-01')).toBeNull();
    });

    test('should return null for February 29 on a non-leap year (29/02/2023)', () => {
      expect(parseDate('29/02/2023')).toBeNull();
    });
  });
});
