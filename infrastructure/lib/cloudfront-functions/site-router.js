// CloudFront Function (cloudfront-js-1.0, ES5).
// The stack substitutes the apex hostname into the string below.
// Next.js static export (trailingSlash: false) writes /latest/<slug>.html.
function handler(event) {
  var request = event.request;
  var hostHeader = request.headers && request.headers.host;
  var host = hostHeader && hostHeader.value ? String(hostHeader.value).toLowerCase() : '';
  var apex = '__APEX_DOMAIN__';

  if (host === 'www.' + apex) {
    return redirectToApex(request, apex);
  }

  return rewriteExtensionlessHtml(request);
}

function redirectToApex(request, apex) {
  var location = 'https://' + apex + (request.uri || '/');
  var query = serializeQuery(request.querystring);
  if (query) {
    location += '?' + query;
  }
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: location },
    },
  };
}

function rewriteExtensionlessHtml(request) {
  var uri = request.uri || '/';
  var method = (request.method || 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    return request;
  }

  // Real files (js, css, images, already-rendered .html) pass through.
  if (uri.indexOf('.') !== -1) {
    return request;
  }

  if (uri === '/') {
    return request;
  }

  if (uri.charAt(uri.length - 1) === '/') {
    uri = uri.substring(0, uri.length - 1);
  }

  if (!uri || uri === '/') {
    request.uri = '/';
    return request;
  }

  request.uri = uri + '.html';
  return request;
}

function serializeQuery(querystring) {
  if (!querystring) {
    return '';
  }
  var parts = [];
  for (var key in querystring) {
    if (!Object.prototype.hasOwnProperty.call(querystring, key)) {
      continue;
    }
    var entry = querystring[key];
    if (entry.multiValue && entry.multiValue.length) {
      for (var i = 0; i < entry.multiValue.length; i++) {
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(entry.multiValue[i].value));
      }
    } else if (entry.value !== undefined) {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(entry.value));
    }
  }
  return parts.join('&');
}
