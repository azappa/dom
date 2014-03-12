/*jshint node:true, eqnull:true, laxcomma:true, undef:true, indent:2, camelcase:false */
'use strict';


var http = require('http')
  , url = require('url')
  , request = require('request')
  , cheerio = require('cheerio')
  ;

require('sugar');


http.createServer(function (req, res) {

  //  -- getting url from url parameter in address bar (if not get a default address :D)
  var pageURL = url.parse(req.url, true).query.url || 'http://www.alessiozappa.com'
    , pageElement = url.parse(req.url, true).query.element || '*'
    , outputObj
    ;


  request(pageURL, function (e, r, b) {

    if (e) {
      //  -- got an error --
      outputObj = {'error': 'undefined code error'};
      res.end(JSON.stringify(outputObj));

    } else {
      //  -- status code is not ok --
      if (r.statusCode !== 200) {
        
        outputObj = {'error': 'code ' + r.statusCode};
        res.end(JSON.stringify(outputObj));

      } else {
        //  -- everything went smooth (i hope!) --
        var $ = cheerio.load(b)
          , head = $.root().find('head').children()
          , body = pageElement === '*' ? $.root().find('body').children() : $(pageElement)
          , checkTags = ['src', 'href']
          , elements = pageElement === '*' ? [[head, 'head'], [body, 'body']] : [[body, 'body']]
          , iterate
          , replaceRelativeUrls
          , buildObjects
          ;


        //  -- replace checkTags values with absolute path urls --
        replaceRelativeUrls = function (el) {
          checkTags.each(function (tag) {
            if (Object.has(el.attribs, tag) && (!el.attribs[tag].startsWith(pageURL) && !el.attribs[tag].startsWith('//'))) {
              el.attribs[tag] = (pageURL + '/' + el.attribs[tag]).replace('//', '/');
            }
          });
        };


        //  -- cycling through children --
        iterate = function (el, depth, arrayToAppend) {

          if ($(el).children().length > 0) {
            $(el).children().each(function (i, c) {

              replaceRelativeUrls(c);

              var tObj = {
                'tag': c.name,
                'attrib': c.attribs,
                'depth': depth + 1,
                'children': []
              };

              arrayToAppend.push(tObj);
              iterate($(c), depth + 1, tObj.children);
            });
          } else {

            var tObj = {
              'depth': depth + 1,
              'children': 0,
              'value': $(el).text()
            };

            arrayToAppend.push(tObj);
          }
        };

        if (pageElement === '*') {
          outputObj = {
            'url': pageURL,
            'element': pageElement,
            'head': [],
            'body': []
          };
        } else {
          outputObj = {
            'url': pageURL,
            'element': pageElement,
            'body': []
          };
        }

        //  -- build each obj (head + body) --
        buildObjects = function (o) {

          if (o[0].length > 0) {
            $(o[0]).each(function (i, el) {
              var _depth = 0
                ;

              if (el.name) {
                replaceRelativeUrls(el);

                var objToCreate = {
                  'tag': el.name,
                  'attr': el.attribs,
                  'depth': _depth,
                  'children': []
                };

                if (pageElement !== '*') {
                  objToCreate.value = $(el).text();
                } else {
                  iterate($(el), _depth, objToCreate.children);
                }
                outputObj[o[1]].push(objToCreate);
              } else {
                return;
              }
            });

          } else {
            
            outputObj[o[1]].push(
              [
                {
                  'html': $.root().find([o[1]]).html(),
                }
              ]
            );

          }
        };


        //  -- build final object --
        elements.each(function (element) {
          buildObjects(element);
        });


        //  -- send results --
        res.end('<pre style="font-size: 11px;">' + JSON.stringify(outputObj, null, 2) + '</pre>', 'utf-8');

      }

    }

  });


}).listen(1337, '127.0.0.1');