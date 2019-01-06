const http = require('http');
const url = require('url');
const request = require('request');
const cheerio = require('cheerio');
const Sugar = require('sugar');

Sugar.extend();

http.createServer((req, res) => {
  //  -- getting url from url parameter in address bar (if not get a default address :D)
  const pageURL = url.parse(req.url, true).query.url || 'http://www.alessiozappa.com';
  const pageElement = url.parse(req.url, true).query.element || '*';
  let outputObj = null;


  request(pageURL, (e, r, b) => {
    if (e) {
      //  -- got an error --
      outputObj = { error: 'undefined code error' };
      res.end(JSON.stringify(outputObj));
      return;
    }
    //  -- status code is not ok --
    if (r.statusCode !== 200) {
      outputObj = { error: 'code ' + r.statusCode };
      res.end(JSON.stringify(outputObj));
    } else {
      //  -- everything went smooth (i hope!) --
      const $ = cheerio.load(b);
      const head = $.root().find('head').children();
      const body = pageElement === '*' ? $.root().find('body').children() : $(pageElement);
      const checkTags = ['src', 'href'];
      const elements = pageElement === '*' ? [[head, 'head'], [body, 'body']] : [[body, 'body']];
      let iterate = null;
      let replaceRelativeUrls = null;
      let buildObjects = null;


      //  -- replace checkTags values with absolute path urls --
      replaceRelativeUrls = (el) => {
        checkTags.forEach((tag) => {
          if (Object.has(el.attribs, tag)) {
            if (typeof el.attribs[tag] !== 'undefined' && el.attribs[tag] !== undefined) {
              if (
                el.attribs[tag].startsWith('//')
                || el.attribs[tag].startsWith('http://')
                || el.attribs[tag].startsWith('https://')
              ) {
                return;
              }
              el.attribs[tag] = (pageURL + '/' + el.attribs[tag]).replace('//', '/');
            }
          }
        });
      };


      //  -- cycling through children --
      iterate = (el, depth, arrayToAppend) => {
        if ($(el).children().length > 0) {
          $(el).children().each((i, c) => {
            replaceRelativeUrls(c);

            const tObj = {
              tag: c.name,
              attrib: c.attribs,
              depth: depth + 1,
              children: []
            };

            arrayToAppend.push(tObj);
            iterate($(c), depth + 1, tObj.children);
          });
        } else {
          const tObj = {
            depth: depth + 1,
            children: 0,
            value: $(el).text()
          };

          arrayToAppend.push(tObj);
        }
      };


      outputObj = {
        url: pageURL,
        element: pageElement
      };
      if (pageElement === '*') {
        outputObj.head = [];
        outputObj.body = [];
      } else {
        outputObj.body = [];
      }


      //  -- build each obj (head + body) --
      buildObjects = (o) => {
        if (o[0].length > 0) {
          $(o[0]).each((i, el) => {
            let depth = 0;

            if (el.name) {
              replaceRelativeUrls(el);

              const objToCreate = {
                tag: el.name,
                attr: el.attribs,
                depth,
                children: []
              };

              if (pageElement !== '*') {
                objToCreate.value = $(el).text();
              } else {
                iterate($(el), depth, objToCreate.children);
              }
              outputObj[o[1]].push(objToCreate);
            }
          });
        } else {
          outputObj[o[1]].push(
            [{ html: $.root().find([o[1]]).html() }]
          );
        }
      };


      //  -- build final object --
      elements.forEach((element) => {
        buildObjects(element);
      });


      //  -- send results --
      res.end('<pre style="font-size: 11px;">' + JSON.stringify(outputObj, null, 2) + '</pre>', 'utf-8');
    }
  });
}).listen(1337, '127.0.0.1');
