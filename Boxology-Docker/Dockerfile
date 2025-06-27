FROM fjudith/draw.io

COPY ./js/plugins/BoxologyValidation.js /usr/local/tomcat/webapps/draw/plugins/BoxologyValidation.js

COPY ./lib/PatternLib.xml /usr/local/tomcat/webapps/draw/lib/PatternLib.xml
COPY ./lib/ShapeLib.xml /usr/local/tomcat/webapps/draw/lib/ShapeLib.xml
COPY ./lib/AnnotationLib.xml /usr/local/tomcat/webapps/draw/lib/AnnotationLib.xml




# Copy docker-entrypoint
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["catalina.sh", "run"]



