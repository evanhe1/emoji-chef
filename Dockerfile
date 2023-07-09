FROM nginx

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d

COPY . /usr/share/nginx/html

EXPOSE 8080

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]