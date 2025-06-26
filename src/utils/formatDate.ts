/**
 * Formats a date string or Date object for display
 * @param date - Date string or Date object to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "N/A";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  return new Intl.DateTimeFormat("en-US", {
    ...defaultOptions,
    ...options,
  }).format(dateObj);
}

/**
 * Formats a date to show relative time (e.g., "2 hours ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeDate(
  date: string | Date | null | undefined,
): string {
  if (!date) return "N/A";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return formatDate(dateObj);
  }
}

/**
 * Extract and format timestamp from API ID
 * Handles API IDs in format: baseId-YYYYMMDD-HHMMSS
 * @param apiId - The API ID that might contain a timestamp
 * @returns Object with hasTimestamp boolean and formatted timestamp string
 */
export function extractTimestampFromApiId(apiId: string): {
  hasTimestamp: boolean;
  timestamp: string | null;
  formattedTimestamp: string | null;
} {
  // Pattern to match timestamp in format YYYYMMDD-HHMMSS at the end
  const timestampPattern = /(\d{8}-\d{6})(?:-\d+)?$/;
  const match = apiId.match(timestampPattern);
  
  if (!match) {
    return {
      hasTimestamp: false,
      timestamp: null,
      formattedTimestamp: null,
    };
  }

  const timestamp = match[1]; // YYYYMMDD-HHMMSS
  
  try {
    // Parse the timestamp: YYYYMMDD-HHMMSS
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hour = timestamp.slice(9, 11);
    const minute = timestamp.slice(11, 13);
    const second = timestamp.slice(13, 15);
    
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    
    if (isNaN(date.getTime())) {
      return {
        hasTimestamp: false,
        timestamp: null,
        formattedTimestamp: null,
      };
    }

    // Format as "Dec 20, 2024 at 2:30 PM"
    const formattedTimestamp = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return {
      hasTimestamp: true,
      timestamp,
      formattedTimestamp,
    };
  } catch (error) {
    return {
      hasTimestamp: false,
      timestamp: null,
      formattedTimestamp: null,
    };
  }
}
