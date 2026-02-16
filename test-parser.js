const { JSDOM } = require('jsdom');

const xml = `<fetch top="50">
  <entity name="account">
    <filter>
      <condition attribute="statecode" operator="eq" value="1" />
      <condition entityname="S" attribute="address1_country" operator="eq" value="df" />
    </filter>
    <order attribute="accountid" />
    <link-entity name="systemuser" from="systemuserid" to="createdby" alias="U">
      <filter>
        <condition attribute="accessmode" operator="eq" value="5" />
        <condition attribute="siteid" operator="eq" value="d0719c91-7de3-ef11-9342-000d3a6af43f" uiname="ACT" uitype="site" />
      </filter>
    </link-entity>
  </entity>
</fetch>`;

const dom = new JSDOM('');
const parser = new dom.window.DOMParser();
const doc = parser.parseFromString(xml, 'application/xml');

const entityEl = doc.querySelector('fetch > entity, entity');
console.log('entity found:', !!entityEl);

// Get filter elements directly under entity
const filterElements = entityEl.querySelectorAll(':scope > filter');
console.log('Direct filters found:', filterElements.length);

filterElements.forEach((filterEl, idx) => {
    console.log(`\nFilter ${idx}:`);
    const conditions = filterEl.querySelectorAll(':scope > condition');
    console.log('  Direct conditions:', conditions.length);
    conditions.forEach((condEl, j) => {
        console.log(`  Condition ${j}:`, {
            attribute: condEl.getAttribute('attribute'),
            operator: condEl.getAttribute('operator'),
            value: condEl.getAttribute('value'),
            entityname: condEl.getAttribute('entityname')
        });
    });
});

// Check link-entities
const linkEntities = entityEl.querySelectorAll(':scope > link-entity');
console.log('\n\nLink-entities found:', linkEntities.length);
linkEntities.forEach((linkEl, idx) => {
    console.log(`\nLink-entity ${idx}:`, {
        name: linkEl.getAttribute('name'),
        alias: linkEl.getAttribute('alias')
    });
    const filter = linkEl.querySelector(':scope > filter');
    if (filter) {
        const conditions = filter.querySelectorAll(':scope > condition');
        console.log('  Nested conditions:', conditions.length);
        conditions.forEach((condEl, j) => {
            console.log(`  Condition ${j}:`, {
                attribute: condEl.getAttribute('attribute'),
                uiname: condEl.getAttribute('uiname'),
                uitype: condEl.getAttribute('uitype')
            });
        });
    }
});
