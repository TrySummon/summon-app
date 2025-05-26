/**
 * React hook to detect the current platform in Electron
 * @returns {Object} Platform information and helper functions
 */
export const usePlatform = () => {
  // Safely detect platform in both main and renderer processes
  const getPlatform = () => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('win')) return 'win32';
      if (userAgent.includes('mac')) return 'darwin';
      if (userAgent.includes('linux')) return 'linux';
      if (userAgent.includes('freebsd')) return 'freebsd';
      if (userAgent.includes('openbsd')) return 'openbsd';
      if (userAgent.includes('sunos')) return 'sunos';
      
      return 'unknown';
    }
    
    // If process is available (main process), use it
    if (typeof process !== 'undefined' && process.platform) {
      return process.platform;
    }
    
    return 'unknown';
  };

  const platform = getPlatform();

  // Helper functions for platform detection
  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';
  const isFreeBSD = platform === 'freebsd';
  const isOpenBSD = platform === 'openbsd';
  const isSunOS = platform === 'sunos';

  // Get human-readable platform name
  const getPlatformName = () => {
    switch (platform) {
      case 'win32':
        return 'Windows';
      case 'darwin':
        return 'macOS';
      case 'linux':
        return 'Linux';
      case 'freebsd':
        return 'FreeBSD';
      case 'openbsd':
        return 'OpenBSD';
      case 'sunos':
        return 'SunOS';
      default:
        return 'Unknown';
    }
  };

  return {
    platform,
    platformName: getPlatformName(),
    isWindows,
    isMac,
    isLinux,
    isFreeBSD,
    isOpenBSD,
    isSunOS,
    // Grouped helpers
    isUnix: isLinux || isMac || isFreeBSD || isOpenBSD || isSunOS,
    isPosix: isLinux || isMac || isFreeBSD || isOpenBSD || isSunOS,
  };
};

// Alternative version with immediate detection (no loading state)
export const usePlatformSync = () => {
  // Safely detect platform in both main and renderer processes
  const getPlatform = () => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('win')) return 'win32';
      if (userAgent.includes('mac')) return 'darwin';
      if (userAgent.includes('linux')) return 'linux';
      if (userAgent.includes('freebsd')) return 'freebsd';
      if (userAgent.includes('openbsd')) return 'openbsd';
      if (userAgent.includes('sunos')) return 'sunos';
      
      return 'unknown';
    }
    
    // If process is available (main process), use it
    if (typeof process !== 'undefined' && process.platform) {
      return process.platform;
    }
    
    return 'unknown';
  };

  const platform = getPlatform();

  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';
  const isFreeBSD = platform === 'freebsd';
  const isOpenBSD = platform === 'openbsd';
  const isSunOS = platform === 'sunos';

  const getPlatformName = () => {
    switch (platform) {
      case 'win32':
        return 'Windows';
      case 'darwin':
        return 'macOS';
      case 'linux':
        return 'Linux';
      case 'freebsd':
        return 'FreeBSD';
      case 'openbsd':
        return 'OpenBSD';
      case 'sunos':
        return 'SunOS';
      default:
        return 'Unknown';
    }
  };

  return {
    platform,
    platformName: getPlatformName(),
    isWindows,
    isMac,
    isLinux,
    isFreeBSD,
    isOpenBSD,
    isSunOS,
    isUnix: isLinux || isMac || isFreeBSD || isOpenBSD || isSunOS,
    isPosix: isLinux || isMac || isFreeBSD || isOpenBSD || isSunOS,
  };
};