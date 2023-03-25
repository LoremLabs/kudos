import { BloomFilter } from 'bloomfilter';
import { addToast } from '$lib/stores/toasts';
import { clearConfigStore } from '$lib/stores/clearConfig';

export let bloomFilterData;
export let lastBloomUpdateTs = 0;
export let bloom;
export let bloomStaleness = 1000 * 30; // 30 seconds

let bloomEtag = '';

export const updateBloomCache = async () => {
  //
  const clearConfig = await clearConfigStore?.init();
  // console.log({ clearConfig });
  const identResolver = clearConfig?.identity?.identResolver;
  if (!identResolver) {
    addToast({
      msg: 'Payment resolver not configured. Configure in Settings → Identity',
      type: 'error',
      duration: 3000,
    });

    throw new Error('No ident resolver set');
  }

  const headers = {
    accept: 'application/json',
  };
  if (bloomEtag !== '') {
    headers['if-none-match'] = bloomEtag;
  }

  try {
    bloomFilterData = await fetch(`${identResolver}/api/v1/bloom`, {
      headers,
    }).then((r) => {
      // save etag
      const headers = r.headers;
      const etag = headers.get('etag'); // TODO: unclear if Tauri / browser does this etag for us. If so, remove (304 seems to be working?)
      if (etag) {
        bloomEtag = etag;
      }
      return r.json();
    });
  } catch (e) {
    console.log('error getting bloom filter', e);
    addToast({
      msg: 'Error contacting payment resolver. Check your network connection and try again.',
      type: 'error',
      duration: 3000,
    });
    throw e;
  }
  bloom = new BloomFilter(bloomFilterData, 16);
  lastBloomUpdateTs = Date.now();
  return bloom;
};

export const decorateDistList = async ({ distItems }) => {
  try {
    await updateBloomCache();
    // console.log({ distItems });
    if (bloom && distItems) {
      distItems.forEach((item) => {
        if (item) {
          item.indication = bloom.test(item.identifier);
        }
      });
    }
  } catch (e) {
    console.log('error decorating dist list', e);
  }
};
