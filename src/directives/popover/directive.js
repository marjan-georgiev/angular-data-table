import angular from 'angular';

/**
 * Popover Directive
 * @param {object} $q              
 * @param {function} $timeout        
 * @param {function} $templateCache  
 * @param {function} $compile        
 * @param {function} PopoverRegistry 
 * @param {function} $animate        
 */
export function PopoverDirective($q, $timeout, $templateCache, $compile, PopoverRegistry, PositionHelper, $animate){

  /**
   * Loads a template from the template cache
   * @param  {string} template 
   * @param  {boolean} plain    
   * @return {object}  html template
   */
  function loadTemplate(template, plain) {
    if (!template) {
      return '';
    }

    if (angular.isString(template) && plain) {
      return template;
    }

    return $templateCache.get(template) || $http.get(template, { cache : true });
  }

  /**
   * Determines a boolean given a value
   * @param  {object} value 
   * @return {boolean}       
   */
  function toBoolean(value) {
    if (value && value.length !== 0) {
      var v = ("" + value).toLowerCase();
      value = (v == 'true');
    } else {
      value = false;
    }
    return value;
  }

  return {
    restrict: 'A',
    scope: true,
    replace: false,
    link: function ($scope, $element, $attributes) {
      $scope.popover = null;
      $scope.popoverId = Date.now();

      $scope.options = {
        text: $attributes.swPopoverText,
        template: $attributes.swPopoverTemplate,
        plain: toBoolean($attributes.swPopoverPlain || false),
        placement: $attributes.swPopoverPlacement || 'right',
        alignment: $attributes.swPopoverAlignment  || 'center',
        group: $attributes.swPopoverGroup,
        spacing: parseInt($attributes.swPopoverSpacing) || 0
      };

      // attach exit and enter events to element
      $element.off('mouseenter', display);
      $element.on('mouseenter', display);
      $element.off('mouseleave', mouseOut);
      $element.on('mouseleave', mouseOut);

      function mouseOut(){
        $scope.exitTimeout = $timeout(remove, 500);
      };

      /**
       * Displays the popover on the page
       */
      function display(){
        // Cancel exit timeout
        $timeout.cancel($scope.exitTimeout);

        var elm = document.getElementById(`#sw-${$scope.popoverId}`);
        if ($scope.popover && elm) return; 

        // remove other popovers from the same group
        if ($scope.options.group){
          PopoverRegistry.removeGroup($scope.options.group, $scope.popoverId);
        }

        if ($scope.options.text && !$scope.options.template){
          $scope.popover = angular.element(`<div class="sw-popover sw-popover-text 
            sw-popover${$scope.options.placement}" id="sw-${$scope.popoverId}"></div>`);

          $scope.popover.html($scope.options.text);
          angular.element(document.body).append($scope.popover);
          positionPopover($element, $scope.popover, $scope.options);
          PopoverRegistry.add($scope.popoverId, {element: $element, popover: $scope.popover, group: $scope.options.group});

        } else {
          $q.when(loadTemplate($scope.options.template, $scope.options.plain)).then(function(template) {
            if (!angular.isString(template)) {
              if (template.data && angular.isString(template.data)){
                template = template.data;
              } else {
                template = '';
              }
            }

            $scope.popover = angular.element(`<div class="sw-popover 
              sw-popover-${$scope.options.placement}" id="sw-${$scope.popoverId}"></div>`);

            $scope.popover.html(template);
            $compile($scope.popover)($scope);
            angular.element(document.body).append($scope.popover);
            positionPopover($element, $scope.popover, $scope.options);

            // attach exit and enter events to popover
            $scope.popover.off('mouseleave', mouseOut);
            $scope.popover.on('mouseleave', mouseOut);
            $scope.popover.on('mouseenter', function(){
              $timeout.cancel($scope.exitTimeout);
            });

            PopoverRegistry.add($scope.popoverId, {
              element: $element,
              popover: $scope.popover,
              group: $scope.options.group
            });
          });
        }
      };

      /**
       * Removes the template from the registry and page
       */
      function remove(){
        if ($scope.popover){
          $scope.popover.remove();
        }
        $scope.popover = undefined;
        PopoverRegistry.remove($scope.popoverId);
      };

      /**
       * Positions the popover
       * @param  {object} triggerElement 
       * @param  {object} popover        
       * @param  {object} options        
       */
      function positionPopover(triggerElement, popover, options){
        $timeout(function(){
          var elDimensions = triggerElement[0].getBoundingClientRect(),
              popoverDimensions = popover[0].getBoundingClientRect(),
              top, left;

          if (options.placement === 'right'){
            left = elDimensions.left + elDimensions.width + options.spacing;
            top = PositionHelper.calculateVerticalAlignment(elDimensions, 
              popoverDimensions, options.alignment);
          }
          if (options.placement === 'left'){
            left = elDimensions.left - popoverDimensions.width - options.spacing;
            top = PositionHelper.calculateVerticalAlignment(elDimensions, 
              popoverDimensions, options.alignment);
          }
          if (options.placement === 'top'){
            top = elDimensions.top - popoverDimensions.height - options.spacing;
            left = PositionHelper.calculateHorizontalAlignment(elDimensions, 
              popoverDimensions, options.alignment);
          }
          if (options.placement === 'bottom'){
            top = elDimensions.top + elDimensions.height + options.spacing;
            left = PositionHelper.calculateHorizontalAlignment(elDimensions, 
              popoverDimensions, options.alignment);
          }

          popover.css({
            top: top + 'px', 
            left: left + 'px'
          });

          addCaret($scope.popover, elDimensions, popoverDimensions);
          $animate.addClass($scope.popover, 'sw-popover-animation');
        }, 50);
      };

      /**
       * Adds a caret and positions it relatively to the popover
       * @param {object} popoverEl         
       * @param {object} elDimensions      
       * @param {object} popoverDimensions 
       */
      function addCaret(popoverEl, elDimensions, popoverDimensions){
        var caret = angular.element('<span class="popover-caret caret-' + $scope.options.placement + '"></span>');
        popoverEl.append(caret);
        var caretDimensions = caret[0].getBoundingClientRect();

        var left, top;
        if ($scope.options.placement === 'right'){
          left = -6;
          top = PositionHelper.calculateVerticalCaret(elDimensions, 
            popoverDimensions, caretDimensions, $scope.options.alignment);
        }
        if ($scope.options.placement === 'left'){
          left = popoverDimensions.width - 2;
          top = PositionHelper.calculateVerticalCaret(elDimensions, 
            popoverDimensions, caretDimensions, $scope.options.alignment);
        }
        if ($scope.options.placement === 'top'){
          top = popoverDimensions.height - 5;
          left = PositionHelper.calculateHorizontalCaret(elDimensions, 
            popoverDimensions, caretDimensions, $scope.options.alignment);
        }

        if ($scope.options.placement === 'bottom'){
          top = -8;
          left = PositionHelper.calculateHorizontalCaret(elDimensions, 
            popoverDimensions, caretDimensions, $scope.options.alignment);
        }

        caret.css({
          top: top + 'px', 
          left: left + 'px'
        });
      };

    }
  }
};
