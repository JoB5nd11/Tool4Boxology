FROM fjudith/draw.io

COPY ./js/plugins/BoxologyValidation.js /usr/local/tomcat/webapps/draw/plugins/boxologyvalidation.js
COPY ./lib/VocabularyLibrary.drawio /usr/local/tomcat/webapps/draw/lib/VocabularyLibrary.drawio

# Copy docker-entrypoint
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["catalina.sh", "run"]



