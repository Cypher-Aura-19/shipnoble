# Builds every service page from warehousing.html (the template) plus the content below.
# python tools/make-services.py        (run node tools/proc-art.mjs first: it writes the step drawings)
import re, time, json, html as H
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TPL = (ROOT / 'warehousing.html').read_text(encoding='utf8')
ART = json.loads((ROOT / 'tools' / 'out' / 'proc-art.json').read_text(encoding='utf8'))   # node tools/proc-art.mjs (line drawings)
MINI = json.loads((ROOT / 'tools' / 'out' / 'proc-mini.json').read_text(encoding='utf8'))  # node tools/proc-mini.mjs (animated anatomy scenes)

WAREHOUSE = dict(slug='warehousing', floorTitle='Follow one order through the floor.',
  route=[('A-03', 'Inventory management', 'Real-time inventory tracking and automated stock updates, so you have full visibility and control of your products at all times.'),
         ('C-06', 'Order fulfillment', 'Picking, packing and shipping handled in one flow, for accurate and timely delivery across B2B and B2C channels.'),
         ('CZ-02', 'Temperature-controlled storage', 'Secure, optimized storage with temperature-controlled environments and organized layouts for efficient retrieval and rotation.'),
         ('PK-01', 'Value-added services', 'Custom packaging, kitting, labeling and product assembly that present your brand well and meet unique shipping needs.'),
         ('DOCK 1', 'Distribution &amp; shipping', 'Our carrier network and in-house logistics management system move products swiftly and cost-effectively, local or global.')])

def proc_html(p):
    # how it works: the title stays in view while one card per step scrolls past a timeline
    steps = ''.join(f'''
        <li class="proc-step"><span class="proc-ring" aria-hidden="true"></span>
          <article class="proc-card" data-enter>
            <div class="proc-art iso" data-theme="light">{art}</div>
            <p class="proc-code">{c}</p>
            <h3 class="proc-name">{n}</h3>
            <p class="proc-text">{t}</p>
          </article>
        </li>''' for (c, n, t), art in zip(p['route'], MINI.get(p['slug']) or ART[p['slug']]))
    return f'''<section class="proc" id="floor" aria-labelledby="proc-title">
    <div class="proc-inner">
      <div class="proc-head">
        <p class="ap-eyebrow"><span class="ap-dot"></span>How it works</p>
        <h2 class="proc-title" id="proc-title">{p['floorTitle']}</h2>
        <p class="proc-sub">Five steps, run on one system and tracked from start to finish.</p>
      </div>
      <ol class="proc-list" data-proc>
        <li class="proc-rail" aria-hidden="true"><i data-proc-fill></i></li>{steps}
      </ol>
    </div>
  </section>'''

def swap_proc(h, p):
    return re.sub(r'<section class="(?:floor|proc)" id="floor".*?</section>', lambda m: proc_html(p), h, count=1, flags=re.S)

ICON = {
  'chart': '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 13l3-4 3 2.5L17 7"/>',
  'pin': '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  'route': '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  'truck': '<path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  'box': '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  'shield': '<path d="M12 3l7 3v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
  'plug': '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
  'doc': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  'camera': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7l1.5-3h4l1.5 3"/><circle cx="12" cy="13.5" r="3.4"/>',
  'store': '<path d="M4 9h16v11H4zM3 9l2-5h14l2 5"/><path d="M10 20v-6h4v6"/>',
}
ARROW = '<svg viewBox="0 0 14 14" fill="none"><path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

ALL = {
  'warehousing': ('Warehousing', 'Secure storage with live inventory'),
  'e-commerce-fulfillment': ('E-Commerce Fulfillment', 'Pick, pack and ship from your store'),
  'b2b-transportation': ('B2B Transportation', 'Freight between businesses'),
  'retail-distribution': ('Retail Distribution', 'Store-ready replenishment'),
  'wine-and-spirits-delivery': ('Wine &amp; Spirits Delivery', 'LCBO pickup to signed delivery'),
  'logistics-management-system': ('Logistics Management System', 'One view of every order'),
}

PAGES = [
dict(slug='b2b-transportation', theme='b2b', fig='b2b', figTheme='light',
  name='B2B Transportation', h1='B2B Transport',
  meta='SHIPNOBLE B2B transportation: secure, transparent freight between businesses with real-time tracking and optimized routes.',
  promise='Secure, transparent transportation for business-to-business freight, local or regional.',
  hero=('b2b-hero.webp', 'SHIPNOBLE truck on the highway', '45% 62%'),
  facts=[('pin', 'Real-time tracking', 'See the exact location and status of every shipment.'),
         ('route', 'Optimized routes', 'Our delivery system cuts transit times so goods arrive on schedule.'),
         ('truck', 'Local and regional', 'From local deliveries to regional freight solutions.')],
  floorTitle='Follow one shipment down the road.', figTitle='One shipment, one road', stageLabel='Road model',
  route=[('PICKUP', 'Pickup at the dock', 'Your freight is loaded at our dock, ready for local delivery or regional freight.'),
         ('SCAN', 'Real-time updates', 'Up-to-the-minute tracking shows the exact location and status of your shipment at any time.'),
         ('ROUTE', 'Optimized routes', 'Our delivery management system optimizes routes and reduces transit times, so goods arrive on schedule.'),
         ('TRACK', 'Customer tracking', 'Your customers track their own deliveries, which gives them control and cuts service inquiries.'),
         ('DROP', 'Delivered on schedule', 'Full visibility through to delivery builds trust between you and your customers.')],
  spec=dict(photo=('b2b-spec.webp', 'Pallets of cartons being loaded into a trailer', '60% 50%'),
    a=('Coverage', 'Local and regional.', ['Local deliveries', 'Regional freight']),
    b=('Tracking', ['Live status', 'Exact location', 'Customer view', 'Delay alerts']),
    c=('Delivery management', 'Optimized routes.', 'Shorter transit times and goods delivered on schedule.', 'See live shipments'),
    d=('Operations', 'Issues caught early.', 'Potential delays surface quickly, so we resolve them fast and keep your freight moving.', 'Head office')),
  lms=dict(kicker='SHIPNOBLE LMS', title='Every shipment, visible in real time.', text='Follow each delivery from pickup to drop-off, and share tracking with your customers.',
    cols=['Shipment', 'Stop', 'Pieces', 'Status'],
    rows=[('SN-24081', 'PICKUP', 12, 'kit', 'Loaded'), ('SN-24082', 'SCAN', 8, 'pick', 'In transit'), ('SN-24083', 'ROUTE', 20, 'cold', 'On route'), ('SN-24084', 'TRACK', 6, 'kit', 'Shared'), ('SN-24085', 'DROP', 14, 'ok', 'Delivered')]),
  related=['warehousing', 'retail-distribution', 'e-commerce-fulfillment', 'logistics-management-system'],
  cta=('Moving freight between businesses?', "Tell us your lanes and volumes. We'll plan the route around them.")),

dict(slug='e-commerce-fulfillment', theme='ecom', fig='ecom', figTheme='light',
  name='E-Commerce Fulfillment', h1='E-Commerce',
  meta='SHIPNOBLE e-commerce fulfillment: fast, accurate, secure and scalable pick, pack and ship with deeper last-mile savings.',
  promise="Fast, accurate and scalable fulfillment, from your store to your customer's door.",
  hero=('ecom-hero.webp', 'SHIPNOBLE team member carrying a parcel between storage aisles', '62% 48%'),
  facts=[('truck', 'Carrier networks', 'Economies of scale bring deeper savings on last-mile delivery.'),
         ('chart', 'Real-time visibility', 'Track every order from inventory to the doorstep.'),
         ('box', 'Scales with you', 'A technology-driven 3PL that grows with your business.')],
  floorTitle='Follow one order from click to van.', figTitle='One order, one parcel', stageLabel='Fulfillment floor model',
  route=[('ORDER', 'Order received', 'Orders from your store flow straight into our system, ready to fulfill.'),
         ('PICK', 'Fast picking', 'Items are picked from inventory with accurate, real-time stock counts.'),
         ('PACK', 'Secure packing', 'Every order is packed with care so it arrives intact.'),
         ('LABEL', 'Carrier label', 'We ship through our carrier networks for the most cost-effective delivery.'),
         ('SHIP', 'Last-mile delivery', 'The parcel heads out for efficient, reliable last-mile delivery to your customer.')],
  spec=dict(photo=('ecom-spec.webp', 'Courier unloading parcels from a delivery van', '58% 45%'),
    a=('Carriers', 'Deeper last-mile savings.', ['Carrier networks', 'Economies of scale']),
    b=('Every order', ['Fast', 'Accurate', 'Secure', 'Scalable']),
    c=('Visibility', 'Real-time, end to end.', 'From inventory management to last-mile delivery, every stage is tracked.', 'See live orders'),
    d=('Partnership', 'A complete 3PL.', 'Cost-effectiveness, scalability and real-time visibility for long-term success.', 'Fulfillment centre')),
  lms=dict(kicker='SHIPNOBLE LMS', title='Every order, tracked to the door.', text='See orders move from pick to pack to carrier, all in one place.',
    cols=['Order', 'Stage', 'Items', 'Status'],
    rows=[('#10482', 'ORDER', 2, 'kit', 'New'), ('#10483', 'PICK', 3, 'pick', 'Picking'), ('#10484', 'PACK', 1, 'kit', 'Packing'), ('#10485', 'LABEL', 2, 'cold', 'Labelled'), ('#10486', 'SHIP', 4, 'ok', 'Shipped')]),
  related=['warehousing', 'b2b-transportation', 'retail-distribution', 'logistics-management-system'],
  cta=('Ready to ship more orders?', "Tell us about your store and order volume. We'll set up fulfillment around it.")),

dict(slug='retail-distribution', theme='retail', fig='retail', figTheme='light',
  name='Retail Distribution', h1='Retail',
  meta='SHIPNOBLE retail distribution: products delivered to stores and distribution centres on time, with EDI support and real-time updates.',
  promise='Products delivered to stores and distribution centres, on time and in perfect condition.',
  hero=('retail-hero.webp', 'Warehouse shelves stocked with cartons ready for retail distribution', '50% 50%'),
  facts=[('plug', 'EDI support', 'In-house tech supports EDI files for cost-effective onboarding.'),
         ('chart', 'Real-time updates', 'Full transparency from order receipt to final delivery.'),
         ('route', 'Data-driven routing', 'Collected data optimizes routing and inventory management.')],
  floorTitle='Follow one pallet to the shelf.', figTitle='One pallet, one aisle', stageLabel='Retail distribution model',
  route=[('EDI', 'Order receipt', 'Orders arrive by EDI, then are received, verified and processed.'),
         ('PICK', 'Efficient picking', 'Every step is run to reduce waste and cost.'),
         ('WRAP', 'Perfect condition', 'Pallets are prepared and wrapped so products reach shelves intact.'),
         ('DC', 'Distribution centre', 'Products move to distribution centres quickly, with real-time updates along the way.'),
         ('STORE', 'On the shelf', 'Products reach store shelves on time, for stores and brands across the country.')],
  spec=dict(photo=('retail-spec.webp', 'Pallet of cartons wrapped for retail delivery', '45% 50%'),
    a=('Reach', 'Stores across the country.', ['Stores', 'Distribution centres']),
    b=('How to join', ['Inquiry', 'Proposal', 'Onboarding', 'Launch']),
    c=('Technology', 'EDI ready.', 'In-house tech supports EDI files, so onboarding stays cost-effective.', 'See live orders'),
    d=('Approach', 'Always improving.', 'We refine our processes as market conditions and demands change.', 'Distribution centre')),
  lms=dict(kicker='SHIPNOBLE LMS', title='Every store order, visible end to end.', text='Follow purchase orders from EDI receipt to delivery at the store.',
    cols=['PO', 'Stage', 'Pallets', 'Status'],
    rows=[('PO-55102', 'EDI', 4, 'kit', 'Received'), ('PO-55103', 'PICK', 6, 'pick', 'Picking'), ('PO-55104', 'WRAP', 3, 'cold', 'Wrapped'), ('PO-55105', 'DC', 8, 'kit', 'At DC'), ('PO-55106', 'STORE', 2, 'ok', 'Delivered')]),
  related=['warehousing', 'b2b-transportation', 'e-commerce-fulfillment', 'logistics-management-system'],
  cta=('Getting products onto shelves?', "Tell us your stores and volumes. We'll build the distribution plan around them.")),

dict(slug='wine-and-spirits-delivery', theme='wine', fig='wine', figTheme='light',
  name='Wine &amp; Spirits Delivery', h1='Wine &amp; Spirits',
  meta='SHIPNOBLE wine and spirits delivery in Ontario: LCBO pickup, expert packaging, optimized routes, photo proof and e-signatures.',
  promise='Delivery management for Ontario wineries, from LCBO pickup to a signed delivery.',
  hero=('wine-hero.webp', 'Wine bottles resting on racks in a cellar', '35% 50%'),
  facts=[('store', 'LCBO pickup', 'Daily pickups directly from the LCBO, handled with care.'),
         ('pin', 'Live tracking', 'Instant updates from dispatch to arrival.'),
         ('camera', 'Proof of delivery', 'Photo evidence and electronic signatures on every drop.')],
  floorTitle="Follow one case to the customer's door.", figTitle='One case, one route', stageLabel='Wine delivery model',
  route=[('LCBO', 'LCBO pickup', 'We pick up your orders directly from the LCBO, handled with care and to industry standards.'),
         ('PACK', 'Expert packaging', 'Every case is packed for safe transport, so your wine arrives in perfect condition.'),
         ('ROUTE', 'Route optimization', 'Our routing software cuts unnecessary mileage and cost while keeping deliveries on time.'),
         ('PHOTO', 'Photo evidence', 'Every delivery is photographed, so you know it arrived securely.'),
         ('SIGN', 'E-signature', 'Customers sign electronically for a fast, paperless and verifiable record.')],
  spec=dict(photo=('wine-spec.webp', 'Cases stacked and ready for delivery', '40% 50%'),
    a=('Clients', 'B2B and B2C.', ['Ontario wineries', 'Spirits brands']),
    b=('Every delivery', ['Live updates', 'Photo proof', 'E-signature', 'Bulk upload']),
    c=('Systems', 'ERP and CSV ready.', 'Upload orders in bulk by CSV or connect your ERP for a fully connected supply chain.', 'See live tracking'),
    d=('Service', 'Proactive support.', 'Proactive communication and personal support at every touchpoint.', 'Head office')),
  lms=dict(kicker='SHIPNOBLE DMS', title='Every case, tracked to the door.', text='Live delivery updates, photo evidence and e-signatures in one view.',
    cols=['Order', 'Stage', 'Cases', 'Status'],
    rows=[('LCBO-8812', 'LCBO', 6, 'kit', 'Picked up'), ('LCBO-8813', 'PACK', 12, 'kit', 'Packed'), ('LCBO-8814', 'ROUTE', 4, 'pick', 'On route'), ('LCBO-8815', 'PHOTO', 2, 'cold', 'Photo taken'), ('LCBO-8816', 'SIGN', 8, 'ok', 'Signed')]),
  related=['b2b-transportation', 'warehousing', 'retail-distribution', 'logistics-management-system'],
  cta=('Delivering wine and spirits in Ontario?', "Tell us about your orders and clients. We'll plan pickups and routes around them.")),

dict(slug='logistics-management-system', theme='lms', fig='lms', figTheme='light',
  name='Logistics Management System', h1='Our LMS',
  meta='The SHIPNOBLE Logistics Management System: real-time inventory, warehouse and order management, fleet routing and digital BOLs.',
  promise='The engine behind our services: real-time data and full transparency across every logistics function.',
  hero=('lms-hero.webp', 'Cargo plane above a container port, the network the LMS tracks', '55% 50%'),
  facts=[('chart', 'Real-time inventory', 'Track stock, locations and order accuracy as they happen.'),
         ('truck', 'Fleet management', 'Route optimization, driver performance and delivery times.'),
         ('doc', 'Digital BOLs', 'Customizable bills of lading with no paper trail.')],
  floorTitle='Follow one order through the system.', figTitle='One order, five modules', stageLabel='LMS module board',
  route=[('SYNC', 'Marketplace integration', 'Orders from your sales channels sync straight into the LMS.'),
         ('STOCK', 'Real-time inventory', 'Inventory is tracked from the moment it enters the warehouse.'),
         ('SLOT', 'Warehouse management', 'Location management and customizable workflows keep every order accurate.'),
         ('FLEET', 'Fleet &amp; transportation', 'Route optimization tracks your goods, drivers and estimated delivery times.'),
         ('BOL', 'Digital BOLs', 'Digital, customizable bills of lading remove paper trails and manual entry errors.')],
  spec=dict(photo=('lms-spec.webp', 'Warehouse manager checking inventory on a tablet', '68% 34%'),
    a=('More than a WMS', 'Configurable warehouses.', ['Location management', 'Order accuracy']),
    b=('Modules', ['B2B delivery', 'Orders', 'Marketplaces', 'Productivity']),
    c=('Client-centred', 'Built-in CRM.', 'Smooth communication, transparent updates and proactive problem-solving.', 'See it live'),
    d=('For your business', 'Run it yourself.', 'Scale your own logistics operations with the same technology we run on.', 'Head office')),
  lms=dict(kicker='SHIPNOBLE LMS', title='Your operation, in one view.', text='Inventory, orders and fleet in one dashboard, updated in real time.',
    cols=['Order', 'Module', 'Lines', 'Status'],
    rows=[('ORD-7721', 'SYNC', 3, 'kit', 'Synced'), ('ORD-7722', 'STOCK', 5, 'cold', 'Reserved'), ('ORD-7723', 'SLOT', 2, 'pick', 'Picking'), ('ORD-7724', 'FLEET', 4, 'cold', 'On route'), ('ORD-7725', 'BOL', 1, 'ok', 'Signed')]),
  related=['warehousing', 'e-commerce-fulfillment', 'b2b-transportation', 'retail-distribution'],
  cta=('Want the LMS in your operation?', "Tell us how you run logistics today. We'll show you where the LMS fits.")),
]

def cut(h, start, end_tag, inner=False):
    a = h.index(start); e = h.index(end_tag, a)
    return a, e

def replace_between(h, start, end, new, include_end=True):
    a = h.index(start); e = h.index(end, a) + (len(end) if include_end else 0)
    return h[:a] + new + h[e:]

def page(p):
    h = TPL
    name_txt = H.unescape(p['name'])
    h = re.sub(r'<title>.*?</title>', f'<title>{p["name"]} – SHIPNOBLE</title>', h, count=1)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{p["meta"]}">', h, count=1)
    pass
    h = h.replace('<span class="is-on">Warehousing</span>', f'<span class="is-on">{p["h1"].replace("Our ", "")}</span>', 1)
    h = h.replace('<span aria-current="page">Warehousing</span>', f'<span aria-current="page">{p["name"]}</span>', 1)
    h = re.sub(r'(<h1 class="svh-title" id="svh-title" data-svh-title>).*?(</h1>)', lambda m: m.group(1) + p['h1'] + m.group(2), h, count=1)
    h = re.sub(r'(<p class="svh-promise">).*?(</p>)', lambda m: m.group(1) + p['promise'] + m.group(2), h, count=1)
    h = re.sub(r'<figure class="svh-photo"><img [^>]*></figure>', f'<figure class="svh-photo"><img src="assets/img/{p["hero"][0]}" alt="{p["hero"][1]}" style="object-position:{p["hero"][2]}"></figure>', h, count=1)
    facts = ''.join(f'\n        <li><svg viewBox="0 0 24 24" aria-hidden="true">{ICON[i]}</svg><div><b>{b}</b><span>{t}</span></div></li>' for i, b, t in p['facts'])
    h = replace_between(h, '<ul class="svh-facts">', '</ul>', f'<ul class="svh-facts">{facts}\n      </ul>')

    # how it works
    h = swap_proc(h, p)

    # at a glance
    s = p['spec']
    chips = ''.join(f'<li>{x}</li>' for x in s['a'][2]); tags = ''.join(f'<li>{x}</li>' for x in s['b'][1])
    bento = f'''<div class="spec-bento">
        <figure class="spec-tile spec-photo" data-enter><img src="assets/img/{s['photo'][0]}" alt="{s['photo'][1]}" loading="lazy" style="object-position:{s['photo'][2]}"></figure>
        <article class="spec-tile spec-store" data-enter>
          <h3 class="spec-label">{s['a'][0]}</h3>
          <p class="spec-big">{s['a'][1]}</p>
          <ul class="spec-chips">{chips}</ul>
        </article>
        <article class="spec-tile spec-chan" data-enter>
          <h3 class="spec-label">{s['b'][0]}</h3>
          <ul class="spec-tags">{tags}</ul>
        </article>
        <article class="spec-tile spec-inv" data-enter>
          <h3 class="spec-label">{s['c'][0]}</h3>
          <p class="spec-big">{s['c'][1]}</p>
          <p class="spec-text">{s['c'][2]}</p>
          <a class="spec-link" href="#lms">{s['c'][3]}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5"/></svg></a>
        </article>
        <article class="spec-tile spec-ship" data-enter>
          <h3 class="spec-label">{s['d'][0]}</h3>
          <p class="spec-big">{s['d'][1]}</p>
          <p class="spec-text">{s['d'][2]}</p>
          <p class="spec-addr"><span>{s['d'][3]}</span>486 Evans Avenue, Unit 10, Toronto, ON</p>
        </article>
      </div>'''
    a = h.index('<div class="spec-bento">'); e = h.index('</section>', a)
    h = h[:a] + bento + '\n    </div>\n  ' + h[e:]

    # live view
    L = p['lms']
    h = re.sub(r'(<p class="lmsx-kicker"><span class="ap-live"></span>).*?(</p>)', lambda m: m.group(1) + L['kicker'] + m.group(2), h, count=1)
    h = re.sub(r'(<h2 class="lmsx-title" id="lmsx-title">).*?(</h2>)', lambda m: m.group(1) + L['title'] + m.group(2), h, count=1)
    h = re.sub(r'(<p class="lmsx-text">).*?(</p>)', lambda m: m.group(1) + L['text'] + m.group(2), h, count=1)
    head = ''.join(f'<span role="columnheader">{x}</span>' for x in L['cols'])
    rows = ''.join(f'\n        <div class="lmsx-row" role="row"><span role="cell">{a}</span><span role="cell" class="loc">{b}</span><span role="cell" data-tick="{n}">{n:,}</span><span role="cell"><i class="st st--{k}">{t}</i></span></div>' for a, b, n, k, t in L['rows'])
    table = f'''<div class="lmsx-table" role="table" aria-label="Example view">
        <div class="lmsx-row lmsx-row--head" role="row">{head}</div>{rows}
        <p class="lmsx-note">Example view. Your dashboard shows your own data.</p>
      </div>'''
    a = h.index('<div class="lmsx-table"'); e = h.index('<p class="lmsx-note">', a); e = h.index('</div>', e) + 6
    h = h[:a] + table + h[e:]

    # related + closing
    rel = ''.join(f'\n        <li><a href="{r}.html"><span>{ALL[r][0]}</span><small>{ALL[r][1]}</small><i aria-hidden="true">{ARROW}</i></a></li>' for r in p['related'])
    h = replace_between(h, '<ul class="related-list" data-enter>', '</ul>', f'<ul class="related-list" data-enter>{rel}\n      </ul>')
    h = re.sub(r'(<h2 id="svc-cta-title">).*?(</h2>)', lambda m: m.group(1) + p['cta'][0] + m.group(2), h, count=1)
    h = re.sub(r'(<div class="svc-cta-inner" data-enter>\s*<h2[^>]*>.*?</h2>\s*<p>).*?(</p>)', lambda m: m.group(1) + p['cta'][1] + m.group(2), h, count=1, flags=re.S)
    return h

def local_links(h):
    for slug in ALL: h = h.replace(f'https://shipnoble.com/{slug}/', f'{slug}.html')
    return h

if __name__ == '__main__':
    v = str(int(time.time()))
    bump = lambda h: re.sub(r'(assets/(?:site|service|iso)\.(?:css|js))(\?v=\d+)?"', lambda m: m.group(1) + '?v=' + v + '"', h)
    TPL = local_links(TPL)
    for p in PAGES:
        (ROOT / f'{p["slug"]}.html').write_text(bump(page(p)), encoding='utf8')
        print('wrote', p['slug'] + '.html')
    # the template page gets the same section with its own steps
    wp = ROOT / 'warehousing.html'
    wp.write_text(swap_proc(wp.read_text(encoding='utf8'), WAREHOUSE), encoding='utf8')
    for f in ['warehousing.html', 'index.html', 'contact.html']:
        fp = ROOT / f; fp.write_text(bump(local_links(fp.read_text(encoding='utf8'))), encoding='utf8')
    print('links updated')
