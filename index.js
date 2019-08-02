const svg = d3.select('svg');
const geoProj = d3.geoNaturalEarth1();//d3.geoEquirectangular();//d3.geoOrthographic();
const pathGen = d3.geoPath().projection(geoProj);
const choloMapG = svg.append('g');
const colLegendG = svg.append('g').attr('transform', `translate(45,220)`);
const colourScale = d3.scaleOrdinal();
const colValue = d => d.properties.income_grp;
let selectColVal;
let dimensions;
let csvRecord; 
const colLegend = (selection, args) => {
   const{
      colourScale,
      circleRadius,
      spacing,
      textOffset,
      onClick,
      selectColVal
   } = args;
   const backRect = selection.selectAll('rect').data([null]);
   backRect.enter().append('rect').merge(backRect)
     .attr('x', -1.5*circleRadius).attr('y', -1.5*circleRadius).attr('rx', circleRadius*2)
     .attr('width', 195).attr('height', spacing*colourScale.domain().length + circleRadius*2).attr('fill', 'whitesmoke');
   const groups = selection.selectAll('.tick').data(colourScale.domain());
   const groupsOnEnter = groups.enter().append('g').attr('class', 'tick');
   groupsOnEnter.merge(groups).attr('transform', (d,i) => `translate(0,${i*spacing})`)
              .attr('opacity', d => (!selectColVal || d === selectColVal) ? 1 :0.2 )
              .on('click', d => onClick(d === selectColVal ? null : d));    
   groups.exit().remove();
   //append the circle 
   groupsOnEnter.append('circle').merge(groups.select('circle')).attr('r', circleRadius).attr('fill', colourScale);
   //append the text
   groupsOnEnter.append('text').merge(groups.select('text')).text(d => d).attr('dy', '0.32em').attr('x', textOffset);

}
//the map
const choloMap = (selection, args) => {
   const{
      dimensions,
      colourScale,
      colValue,
      selectColVal  
   } = args;
   //prepare for zoom and reassign g
   const gOnUpdate = selection.selectAll('g').data([null]);
   const gOnEnter = gOnUpdate.enter().append('g');
   const g = gOnUpdate.merge(gOnEnter);

   gOnEnter.append('path')
   .attr('class', 'sphere')
   .attr('d', pathGen({type:'Sphere'}));
   svg.call(d3.zoom().on('zoom', () => {
   g.attr('transform', d3.event.transform);
   }));
   const countryPath = g.selectAll('.country').data(dimensions);
   const countryPathEnter = countryPath
     .enter().append('path')
       .attr('class', 'country');

   countryPath.merge(countryPathEnter)
       .attr('d', d => pathGen(d))
       .attr('fill', d => colourScale(colValue(d)))
       .attr('opacity', d => (!selectColVal || selectColVal === colValue(d)) ? 1: 0.1)
       .classed('selectLegend', d => selectColVal && selectColVal === colValue(d));

   countryPathEnter.append('title').attr('class', 'toolTip')
      .text(d => 'Country: ' + d.properties.name + '\n\n' + 'Dev.category: ' + colValue(d) + '\n' + 'Population: ' 
         + d.properties.pop_est + '\n' + 'GDP: ' + d.properties.gdp_md_est + '\n\n' + 'Unemployment rate (ILO models): '
         + '\n' + 'Year 2000: ' + csvRecord[d.id].UE_2000 + '%' + '\n' + 'Year 2007: ' + csvRecord[d.id].UE_2007 + '%'
         + '\n' + 'Year 2009: ' + csvRecord[d.id].UE_2009 + '%' + '\n' + 'Year 2014: ' + csvRecord[d.id].UE_2014 + '%'
         + '\n' + 'Year 2018: ' + csvRecord[d.id].UE_2018 + '%' + '\n'
         + 'Year 2021(forecast): ' + csvRecord[d.id].UE_2021 + '%');
              
};

const render = () => {
   //data join and colours
   colourScale.domain(dimensions.map(colValue))
              .domain(colourScale.domain().sort().reverse())
              .range(d3.schemeSpectral[colourScale.domain().length]);
   //invoke col legend
   colLegendG.call(colLegend, {
      colourScale,
      circleRadius: 10,
      spacing: 25,
      textOffset: 10,
      onClick,
      selectColVal
   })
   //invoke the map
   choloMapG.call(choloMap, {
      dimensions,
      colourScale,
      colValue,
      selectColVal
   });
   
};

const onClick = d => {
   selectColVal = d;
   render();
}
//load the ILO UE data file and the world map by Mike Bostock
Promise.all([
   d3.tsv('110m.tsv'),
   d3.csv('UE_6Y.csv'),
   d3.json('https://unpkg.com/world-atlas@1/world/110m.json')
]).then(([tsvData, csvData, topoJSONdata]) => {
   //get the whole row 
   const csvRow = csvData.reduce((accumulator,d) => {
      accumulator[(d.iso_n3)] = d;
      return accumulator;
   }, {}); 
   
   const tsvRecord = tsvData.reduce((accumulator,d) => {
      accumulator[d.iso_n3] = d;
      return accumulator;
   }, {}); 
   //convert from topoJSON to geoJSON
   const countries = topojson.feature(topoJSONdata, topoJSONdata.objects.countries);
   countries.features.forEach(d => {
      Object.assign(d.properties, tsvRecord[d.id]);
      
   });
   //set features to pass
   dimensions = countries.features;
   csvRecord = csvRow;
   render();
         
} );

