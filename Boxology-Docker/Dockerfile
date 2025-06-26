FROM fjudith/draw.io

#Copy Plugin File
COPY ./js/plugins/BoxologyValidation.js /usr/local/tomcat/webapps/draw/plugins/BoxologyValidation.js

#Copy Libraries file
COPY ./lib/PatternLib.xml /usr/local/tomcat/webapps/draw/lib/PatternLib.xml
COPY ./lib/ShapeLib.xml /usr/local/tomcat/webapps/draw/lib/ShapeLib.xml


RUN echo 'application/json .json' >> /etc/mime.types


# Copy docker-entrypoint
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["catalina.sh", "run"]



