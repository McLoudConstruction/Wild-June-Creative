/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next's Server Actions default to a 1MB request body limit, which
    // a full-resolution camera photo (logo/favicon/header image
    // uploads in Admin > Settings > Branding, and the watermark image
    // upload) blows past easily. Raised so those forms actually work
    // for real photo files rather than failing silently before the
    // action code even runs.
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

module.exports = nextConfig;
