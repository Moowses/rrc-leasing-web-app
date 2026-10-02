/* Sample inventory only. Replace with approved RRC listings before publication.
   photos supports 1–20 approved images; availability, prices and terms need RRC approval. */
window.RRCProperties = [
  {id:'C-101',type:'commercial',title:'Corner retail space',area:'Bajada',city:'Davao City',kind:'Retail',rent:28000,size:65,bedrooms:0,bathrooms:1,floor:'Ground floor',parking:'Parking subject to confirmation',featured:true,description:'An illustrative ground-floor shop layout with an open frontage. Explore how an RRC commercial listing will present space, access and business-use information.',features:['Open floor layout','Street-facing frontage','Ground-floor access'],photos:['assets/sample-commercial.jpg','assets/sample-commercial-2.jpg','assets/sample-interior.jpg'],available:true,sample:true},
  {id:'C-102',type:'commercial',title:'Flexible office space',area:'Bajada',city:'Davao City',kind:'Office',rent:22000,size:48,bedrooms:0,bathrooms:1,floor:'Second floor',parking:'Parking subject to confirmation',featured:false,description:'A sample office listing with room for a small team. Final floor plans, permitted uses and fit-out conditions will be confirmed for each actual property.',features:['Flexible workspace','Natural light','Shared access'],photos:['assets/sample-interior.jpg','assets/sample-commercial-2.jpg','assets/sample-commercial.jpg'],available:true,sample:true},
  {id:'C-103',type:'commercial',title:'Neighbourhood retail unit',area:'Indangan',city:'Davao City',kind:'Retail',rent:18000,size:40,bedrooms:0,bathrooms:1,floor:'Ground floor',parking:'Parking subject to confirmation',featured:true,description:'A sample neighbourhood commercial unit. This preview demonstrates how businesses can explore locations and describe their intended use when applying.',features:['Neighbourhood setting','Open retail layout','Ground-floor access'],photos:['assets/sample-commercial-2.jpg','assets/sample-commercial.jpg','assets/sample-interior.jpg'],available:true,sample:true},
  {id:'R-201',type:'residential',title:'Two-bedroom townhouse',area:'Matina',city:'Davao City',kind:'Townhouse',rent:18000,size:72,bedrooms:2,bathrooms:2,floor:'Two storeys',parking:'1 illustrative parking space',featured:true,description:'An illustrative two-bedroom home with separate living and sleeping areas. Actual fixtures, inclusions and tenancy conditions will be listed once the property is confirmed.',features:['Two-bedroom layout','Living and dining area','Private entrance'],photos:['assets/sample-residential.jpg','assets/sample-interior.jpg'],available:true,sample:true},
  {id:'R-202',type:'residential',title:'Bright studio apartment',area:'Bajada',city:'Davao City',kind:'Apartment',rent:9500,size:26,bedrooms:0,bathrooms:1,floor:'Second floor',parking:'Parking subject to confirmation',featured:false,description:'A sample studio apartment listing showing the essential information a prospective tenant needs before arranging a viewing.',features:['Studio layout','Kitchenette space','Natural light'],photos:['assets/sample-interior.jpg','assets/sample-residential.jpg'],available:true,sample:true},
  {id:'R-203',type:'residential',title:'Three-bedroom family home',area:'Indangan',city:'Davao City',kind:'House',rent:24000,size:96,bedrooms:3,bathrooms:2,floor:'Two storeys',parking:'1 illustrative parking space',featured:false,description:'An illustrative family-home listing. Use this sample to explore photo browsing and try the residential application process.',features:['Three-bedroom layout','Separate living area','Outdoor space'],photos:['assets/sample-residential.jpg','assets/sample-interior.jpg'],available:true,sample:true}
];

// Local platform sync: Admin-published listings replace matching sample records.
// The static catalogue remains as a safe fallback when the local platform is offline.
function syncPublishedListings() {
  return fetch('/api/properties')
  .then(response => response.ok ? response.json() : [])
  .then(listings => {
    if (!Array.isArray(listings) || !listings.length) return;
    const live = listings.map(listing => ({
      id: listing.id, type: listing.type.toLowerCase(), title: listing.title, area: listing.area, city: listing.city,
      kind: listing.kind || (listing.type === 'COMMERCIAL' ? 'Commercial' : 'Residential'), rent: listing.rent, size: listing.size,
      bedrooms: 0, bathrooms: 1, floor: listing.floor || 'Floor to be confirmed', parking: 'Parking subject to confirmation', featured: false,
      description: `${listing.title} in ${listing.area}, ${listing.city}.`, features: [], photos: (listing.images||[]).map(image=>image.url).filter(Boolean).slice(0,10).concat((listing.images||[]).length?[]:[listing.imageUrl]).filter(Boolean),
      available: listing.availability === 'AVAILABLE', sample: true
    }));
    const byId = new Map(live.map(item => [item.id, item]));
    window.RRCProperties = window.RRCProperties.map(item => {
      const published = byId.get(item.id);
      if (!published) return item;
      // Residential bedrooms, bathrooms, highlights and long description are still
      // part of the approved website content until dedicated unit-detail fields land in the CMS.
      // The CMS remains the source for publication, price, area, availability and photos.
      return item.type === 'residential' && published.type === 'residential'
        ? { ...item, ...published, bedrooms: item.bedrooms, bathrooms: item.bathrooms, parking: item.parking, description: item.description, features: item.features, photos: published.photos.length ? published.photos : item.photos }
        : published;
    });
    live.filter(item => !window.RRCProperties.some(existing => existing.id === item.id)).forEach(item => window.RRCProperties.push(item));
    window.dispatchEvent(new Event('rrc-properties-updated'));
  })
  .catch(() => { /* The public site continues with its local preview catalogue. */ });
}
if (typeof fetch === 'function') {
  syncPublishedListings();
  window.setInterval(syncPublishedListings, 15000);
}


