//**************************************************************************************************************
// 1. Library   
//**************************************************************************************************************
var omb = require('users/milagrosbecerra245/RAMI:Modules/omnibusTest_v1.1');
var util = require('users/milagrosbecerra245/RAMI:Modules/utilities_v1.1');
// var tempsign = require('users/luciovilla/phenology:library2'); 

// Functions  

function DayOfYear1(date) {return ee.Date(date).format('YYYY-MM-dd');}
function DayOfYear2(date) {return ee.Date(date).advance(6, 'day').format('YYYY-MM-dd');}

//**************************************************************************************************************
// 2. Area of Study
//**************************************************************************************************************

var aoi = ee.Geometry.Polygon([[[-70.17208378847724, -11.284902637306308],
          [-70.17208378847724, -13.420432640893468], 
          [-69.26021855410224, -13.420432640893468],
          [-69.26021855410224, -11.284902637306308]]], null, false);
var aoi_MDD = ee.Geometry.Polygon([[[-71.25423982258772, -11.269827408676457],
          [-71.25423982258772, -13.191645526572847],
          [-69.25472810383772, -13.191645526572847],
          [-69.25472810383772, -11.269827408676457]]], null, false);
var roi_S1B_Dates = roi_dates;

var roi_S1B = ee.Geometry.Polygon([[[-71.53988435383772, -12.551646072720917],
          [-71.57833650227522, -12.712452007601168],
          [-70.72140290852522, -12.899930250193577],
          [-70.68295076008772, -12.691017068793414]]]);

var MDD_Clip = ee.Geometry.Polygon([[[-71.70528069775281, -11.019364484031994],
          [-71.70528069775281, -13.194470630577163],
          [-69.05208245556531, -13.194470630577163],
          [-69.05208245556531, -11.019364484031994]]], null, false);

var MDD_ClipEE = ee.FeatureCollection([
    ee.Feature(MDD_Clip, {'class': 1})
]);

// Create a white outline style
var outlineStyle = {
  color: 'FFFFFF', // White color in hexadecimal (RRGGBB)
  width: 2 // Width of the outline line
};

var whiteOutline = ee.FeatureCollection(MDD_ClipEE, {}).style(outlineStyle);

Map.addLayer(whiteOutline, {name: 'Set_Location'})


//#######Define dates#########################
var Dates = ['2020-01-01','2023-10-01'];
var orbitRel = 149; //127;
var orbitPass = 'ASCENDING';//;'DESCENDING'
//################################################
 
//**************************************************************************************************************
// 3. List Dates
//**************************************************************************************************************
// var myCallback = function(object) {
//   print(object)
// }

var collectionSARData = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT').filterBounds(roi_S1B_Dates).filterDate(Dates[0],Dates[1]).filter(ee.Filter.eq('relativeOrbitNumber_start', orbitRel)).sort('system:time_start');
var ListOfDates1 = ee.List(collectionSARData.aggregate_array('system:time_start')).map(DayOfYear1).getInfo();
var ListOfDates2 = ee.List(collectionSARData.aggregate_array('system:time_start')).map(DayOfYear2).getInfo();
var CountDates1  = ListOfDates1.length;
var count = CountDates1;
print("ListOfDates1",ListOfDates1);
print("ListOfDates2",ListOfDates2);

//******************************************************************************

function collection_FLOAT(Dates1,Dates2,AoI_,orbitPass_,orbitRel_){
  var SAR_Col_FLOAT = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT')
                .filterBounds(AoI_)
                .filterDate(Dates1, Dates2)
                .filter(ee.Filter.eq('relativeOrbitNumber_start', orbitRel_))
                .filter(ee.Filter.eq('orbitProperties_pass', orbitPass_));
                // .mosaic();
  var maskAngle = function(image) {var ia = image.select('angle');return image.updateMask(ia.gte(31).and(ia.lte(45)));};
  var S1subClean =  SAR_Col_FLOAT.map(maskAngle);              
  var S1_singleDate = S1subClean.mosaic();
  return S1_singleDate.clip(MDD_Clip).select(['VV','VH']);             
}

// print('SAR Data', collection(ListOfDates1[0],ListOfDates2[0],aoi,orbitPass));

var SARList_FLOAT = [];
print("SAR List Before: ",SARList_FLOAT);

for (var j=0; j < count; j++){
  
    var SARImage_FLOAT = collection_FLOAT(ListOfDates1[j],ListOfDates2[j],aoi_MDD,orbitPass,orbitRel).clip(MDD_Clip).set('system:time_start', ee.Date(ListOfDates1[j]).millis(),'dateYMD', ee.Date(ListOfDates1[j]).format('YYYY-MM-dd'));
    // print(SARImage_FLOAT);
    SARList_FLOAT.push(SARImage_FLOAT);
    // print("SARList: ",SARList_FLOAT);
    // print("--------------------------------");
}
print("SAR List After: ",SARList_FLOAT);
print('Is SARList_FLOAT an EE object?', SARList_FLOAT instanceof ee.ComputedObject);

var SARList_EE = ee.List(SARList_FLOAT);
print('Is SARList_EE an EE object?', SARList_EE instanceof ee.ComputedObject);

print('Timestamps');
var acquisition_times = ee.List(collectionSARData.aggregate_array('system:time_start'));
var countDates = acquisition_times.length().getInfo();

var ListOfdates = ee.List(acquisition_times.getInfo().map(function t(d){ return new Date(d)}));
print("ListOfDates SAR FLOAT",ListOfdates);  

var fCollectionDates = ee.FeatureCollection(ListOfdates
                        .map(function(element){
                        return ee.Feature(null,{prop:element})}));
print("fCollectionDates",fCollectionDates);

//**************************************************************************************************************
// 4. SAR Changes
//**************************************************************************************************************

// Create a list of clipped images
print('-------------------------------');
print('List of clipped images');
var pList = SARList_EE;
print('pList',pList);
var first = ee.Dictionary({imlist:ee.List([]),geom:MDD_ClipEE});
print('first',first);
var imList = ee.List(ee.Dictionary(pList.iterate(omb.clipList,first)).get('imlist'));
print('imList',imList);
print('-------------------------------');

// Run the algorithm | Print results

// Input data 

var jet = ['black','blue','cyan', 'yellow','red'];
var vis = {min:0, max:count, palette:jet};
var significance = 0.0001;
var median = true;


//*****************************************************************
// 5. Run the algorithm | Print results
//*****************************************************************
    
var result = ee.Dictionary(omb.omnibus(imList,significance,median));
  
print(result);

//########################################################################################
// Change maps
//
// cmap: the interval in which the most recent significant change occurred (single-band)
// smap: the interval in which the first significant change occurred (single-band)
// fmap: the frequency of significant changes (single-band)
// bmap: the interval in which each significant change occurred ((k − 1)-band)
//#######################################################################################
//
// print("Forest/Non Forest Base: ", FNFBase);
var cmap = ee.Image(result.get('cmap')).byte();
print("CMAP: ", cmap);
var smap = ee.Image(result.get('smap')).byte();
print("SMAP: ", smap);
var fmap = ee.Image(result.get('fmap')).byte();
print("FMAP: ", fmap);
var bmap = ee.Image(result.get('bmap')).byte();
print("BMAP: ",bmap);
var cnames = ['cmap','smap','fmap'];
    
for (var i = 1; i < count; i++){
  if (i < 10) {var label = 'bmap0'} else {var label= 'bmap'}
    cnames = cnames.concat([label.concat(i.toString())]);
}

print("cnames: ", cnames);

// Concatenate change maps and export

var cmaps = ee.Image.cat(cmap,smap,fmap,bmap).rename(cnames);
print("count: ", count);
print("jet: ", jet);
print("cmaps: ", cmaps);
    
//**************************************************************************************************************
// 6. Visualization
//**************************************************************************************************************
// Map.addLayer(ee.Image(SARList[0]),{bands: ['VV', 'VH', 'VV'],min: [-18, -23, 3], max: [-4, -11, 15]}, "Sentinel-1 GRD RGB First");
Map.addLayer(ee.Image(SARList_FLOAT[62]).log10().multiply(10.0),{bands: ['VV', 'VH', 'VV'],min: [-18, -23, 3], max: [-4, -11, 15]}, "Sentinel-1 _FLOAT GRD RGB First");

var vis = {min:0, max:count, palette:jet};
Map.add(util.makeLegend(vis));
  
Map.centerObject(cmap,10);
// Map.addLayer(mining2019,{palette: 'FF0000'}, 'Mining Feb-Jun 2019');
Map.addLayer(cmaps.select('cmap').clip(roi_S1B),vis,'cmap');
// Map.addLayer(cmaps.select('smap'),vis,'smap');
// Map.addLayer(cmaps.select('fmap').multiply(2),vis,'fmap*2'); 
  
//*****************************************************************
// 7. Export results
//*****************************************************************
var RAMI_historic = ee.ImageCollection('projects/ACCA-SERVIR/RAMI_alerts').map(function (img) {
  return img.neq(0).selfMask();
});

var RAMI_mosaic = RAMI_historic.mosaic();

var smap_v3 = smap.updateMask(RAMI_mosaic.unmask().eq(0));

var exportTask = Export.image.toAsset({
    image:smap_v3,
    description:"smap_v3",
    assetId:"users/milagrosbecerra245/SERVIR/"+"smap_v3",
    // assetId:"users/luciovilla/SERVIR/"+"smap_v3",
    region: MDD_Clip,
    scale:10,
    maxPixels:1e13
});

//Export Task 
var exportTask4 = Export.table.toDrive({
      collection: fCollectionDates,
      folder: 'List_Of_Dates_Folder',
      description:'List_of_Dates_of_Changes_CSV',
      fileFormat: 'CSV'
});
